// Efecto líquido en WebGL sobre un video: el cursor arrastra la imagen como un
// fluido. Un "flow map" de baja resolución guarda la velocidad del cursor, se
// advecta a sí mismo (remolinos) y se disipa poco a poco.

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FLOW_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPrev;
uniform vec2 uMouse;
uniform vec2 uVel;
uniform float uAspect;
uniform float uRadius;
uniform float uDissipation;
uniform vec2 uTexel;

vec2 decode(vec4 c) {
  vec2 v = c.xy * 2.0 - 1.0;
  // Zona muerta suave: evita la deriva por la precisión de 8 bits sin crear bordes.
  return v * smoothstep(0.006, 0.03, length(v));
}

void main() {
  vec2 v = decode(texture2D(uPrev, vUv));
  vec2 back = vUv - v * 0.012;
  // Advección semi-lagrangiana (remolinos) + un poco de difusión (bordes suaves).
  vec2 adv = decode(texture2D(uPrev, back)) * 0.6
    + (decode(texture2D(uPrev, back + vec2(uTexel.x, 0.0)))
     + decode(texture2D(uPrev, back - vec2(uTexel.x, 0.0)))
     + decode(texture2D(uPrev, back + vec2(0.0, uTexel.y)))
     + decode(texture2D(uPrev, back - vec2(0.0, uTexel.y)))) * 0.1;
  adv *= uDissipation;

  vec2 d = vUv - uMouse;
  d.x *= uAspect;
  float falloff = exp(-dot(d, d) / (uRadius * uRadius));
  adv += uVel * falloff;

  gl_FragColor = vec4(clamp(adv, -1.0, 1.0) * 0.5 + 0.5, 0.0, 1.0);
}`;

const MAIN_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uFlow;
uniform sampler2D uVideo;
uniform vec2 uCoverScale;

void main() {
  vec2 flow = texture2D(uFlow, vUv).xy * 2.0 - 1.0;
  vec2 uv = vUv - flow * 0.12;

  // Equivalente a object-fit: cover. El video se sube sin voltear, así que invertimos Y.
  vec2 vuv = (uv - 0.5) * uCoverScale + 0.5;
  vuv.y = 1.0 - vuv.y;
  vec3 col = texture2D(uVideo, clamp(vuv, 0.0, 1.0)).rgb;

  // Oscurecer un poco el centro para que el texto blanco se lea bien.
  col *= 1.0 - 0.22 * smoothstep(0.4, 0.0, length((vUv - 0.5) * vec2(0.6, 1.4)));

  gl_FragColor = vec4(col, 1.0);
}`;

const FLOW_SIZE = 128;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? '');
  return sh;
}

function program(gl: WebGLRenderingContext, frag: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, frag));
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? '');
  const u = (name: string) => gl.getUniformLocation(p, name);
  return { p, u };
}

function target(gl: WebGLRenderingContext) {
  const data = new Uint8Array(FLOW_SIZE * FLOW_SIZE * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = 128;
    data[i + 3] = 255;
  }
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FLOW_SIZE, FLOW_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { tex, fb };
}

export function initLiquidVideo(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  /** Elemento que se desliza encima del hero; cuando lo tapa por completo, se pausa. */
  cover?: HTMLElement | null,
) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false });
  if (!gl) return; // Sin WebGL se ve el video normal, sin efecto.

  const flowProg = program(gl, FLOW_FRAG);
  const mainProg = program(gl, MAIN_FRAG);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  let read = target(gl);
  let write = target(gl);

  const videoTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, videoTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const mouse = { x: 0.5, y: 0.5 };
  const vel = { x: 0, y: 0 };
  let last: { x: number; y: number } | null = null;

  const host = canvas.parentElement ?? canvas;
  host.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    if (last) {
      vel.x += (x - last.x) * 6;
      vel.y += (y - last.y) * 6;
    }
    mouse.x = x;
    mouse.y = y;
    last = { x, y };
  });
  host.addEventListener('pointerleave', () => (last = null));

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  // Visible = el canvas está en pantalla y no está tapado por la hoja que sube.
  let onScreen = true;
  let covered = false;
  let visible = true;
  function updateVisibility() {
    const next = onScreen && !covered;
    if (next === visible) return;
    visible = next;
    if (visible) {
      video.play().catch(() => {});
      requestAnimationFrame(frame);
    } else {
      video.pause();
    }
  }
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    updateVisibility();
  }).observe(canvas);
  if (cover) {
    const checkCovered = () => {
      covered = cover.getBoundingClientRect().top <= 0;
      updateVisibility();
    };
    window.addEventListener('scroll', checkCovered, { passive: true });
    checkCovered();
  }

  function frame() {
    if (!gl) return;
    if (video.readyState < 2) {
      if (visible) requestAnimationFrame(frame);
      return;
    }

    // 1) Actualizar el flow map.
    gl.useProgram(flowProg.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, write.fb);
    gl.viewport(0, 0, FLOW_SIZE, FLOW_SIZE);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, read.tex);
    gl.uniform1i(flowProg.u('uPrev'), 0);
    gl.uniform2f(flowProg.u('uMouse'), mouse.x, mouse.y);
    gl.uniform2f(flowProg.u('uVel'), Math.max(-1, Math.min(1, vel.x)), Math.max(-1, Math.min(1, vel.y)));
    gl.uniform1f(flowProg.u('uAspect'), canvas.width / canvas.height);
    gl.uniform1f(flowProg.u('uRadius'), 0.14);
    gl.uniform2f(flowProg.u('uTexel'), 1 / FLOW_SIZE, 1 / FLOW_SIZE);
    gl.uniform1f(flowProg.u('uDissipation'), 0.985);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    [read, write] = [write, read];
    vel.x *= 0.6;
    vel.y *= 0.6;

    // 2) Pintar el degradado desplazado por el flujo.
    gl.useProgram(mainProg.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, read.tex);
    gl.uniform1i(mainProg.u('uFlow'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, videoTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
    gl.uniform1i(mainProg.u('uVideo'), 1);
    const canvasAspect = canvas.width / canvas.height;
    const videoAspect = video.videoWidth / video.videoHeight;
    gl.uniform2f(
      mainProg.u('uCoverScale'),
      canvasAspect < videoAspect ? canvasAspect / videoAspect : 1,
      canvasAspect < videoAspect ? 1 : videoAspect / canvasAspect,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);

    canvas.dataset.ready = '';
    if (visible) requestAnimationFrame(frame);
  }

  video.play().catch(() => {});
  requestAnimationFrame(frame);
}
