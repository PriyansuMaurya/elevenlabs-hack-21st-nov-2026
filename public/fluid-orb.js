/* Fluid Orb — vanilla port of the Rare UI component.
 *
 *   npx shadcn@latest add swamimalode07/rare-ui/fluid-orb
 *   https://www.rareui.com/components/fluidorb
 *
 * The registry ships a React wrapper around one WebGL shader. This project has
 * no build step, so the React wrapper is gone and the shader, the colour maths
 * and the canvas setup are kept as published. The only addition is a speed
 * control, so the orb can sit still at rest and move with the voice.
 */
(function () {
  'use strict';

  var VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

  var FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_color;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.6;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float t = u_time * 0.22;

  vec2 drift = vec2(
    sin(t) + 0.6 * sin(t * 1.7 + 1.3),
    cos(t * 0.8) + 0.6 * cos(t * 1.3 + 2.1)
  );

  vec2 p = vec2(uv.x * 1.8, uv.y * 1.0) + drift * 0.7;

  vec2 q = vec2(fbm(p + drift), fbm(p + vec2(3.2, 1.5) - drift));
  float f = fbm(p + 1.2 * q);

  float g = clamp(1.0 - uv.y, 0.0, 1.0);
  float anchor = smoothstep(0.0, 0.3, uv.y);
  float shade = clamp(g + (f - 0.5) * 0.8 * anchor, 0.0, 1.0);

  vec3 white = vec3(0.99, 1.0, 1.0);
  vec3 light = mix(white, u_color, 0.5);
  vec3 dark = u_color;

  vec3 col = white;
  col = mix(col, light, smoothstep(0.28, 0.52, shade));
  col = mix(col, dark, smoothstep(0.58, 0.88, shade));

  float edge = smoothstep(0.5, 0.49, distance(uv, vec2(0.5)));

  gl_FragColor = vec4(col * edge, edge);
}
`;

  var SIZE = 512;

  function hexToRgb(hex) {
    var h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (h.length !== 6 || Number.isNaN(n)) return [1, 0.48, 0.27];
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function compile(gl, type, src) {
    var shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('[fluid-orb]', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function FluidOrb(host, options) {
    if (!(this instanceof FluidOrb)) return new FluidOrb(host, options);
    options = options || {};
    this.host = host;
    this.speed = 0;
    this.targetSpeed = 0;
    this.time = 0;
    this.dirty = true;
    this.last = performance.now();
    this.raf = 0;
    this.failed = false;
    this.current = hexToRgb(options.color || '#ff7a45');
    this.target = this.current.slice();

    var canvas = document.createElement('canvas');
    canvas.className = 'orb-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);
    this.canvas = canvas;

    var gl = null;
    try {
      gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
    } catch (error) {
      gl = null;
    }
    if (!gl) {
      this.failed = true;
      host.classList.add('orb--flat');
      host.style.backgroundColor = options.color || '#ff7a45';
      return;
    }
    this.gl = gl;

    var program = gl.createProgram();
    var vert = compile(gl, gl.VERTEX_SHADER, VERT);
    var frag = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!program || !vert || !frag) {
      this.failed = true;
      host.classList.add('orb--flat');
      return;
    }

    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[fluid-orb]', gl.getProgramInfoLog(program));
      this.failed = true;
      host.classList.add('orb--flat');
      return;
    }
    gl.useProgram(program);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    var aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    this.uResolution = gl.getUniformLocation(program, 'u_resolution');
    this.uTime = gl.getUniformLocation(program, 'u_time');
    this.uColor = gl.getUniformLocation(program, 'u_color');

    canvas.width = SIZE;
    canvas.height = SIZE;
    gl.viewport(0, 0, SIZE, SIZE);
    if (this.uResolution) gl.uniform2f(this.uResolution, SIZE, SIZE);
    if (this.uColor) gl.uniform3f(this.uColor, this.current[0], this.current[1], this.current[2]);

    if (this.uTime) gl.uniform1f(this.uTime, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  FluidOrb.prototype.setColor = function (hex) {
    var next = hexToRgb(hex);
    this.target[0] = next[0];
    this.target[1] = next[1];
    this.target[2] = next[2];
    this.dirty = true;
  };

  FluidOrb.prototype.setSpeed = function (speed) {
    this.targetSpeed = Math.max(0, Number(speed) || 0);
  };

  FluidOrb.prototype.loop = function (now) {
    var gl = this.gl;
    if (!gl) return;

    var dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;

    this.speed += (this.targetSpeed - this.speed) * Math.min(1, dt * 5);
    if (this.speed < 0.0005) this.speed = 0;

    var moved = this.speed > 0;
    if (moved) this.time += dt * this.speed;

    var settled = true;
    for (var i = 0; i < 3; i += 1) {
      var delta = this.target[i] - this.current[i];
      if (Math.abs(delta) > 0.002) {
        settled = false;
        this.current[i] += delta * Math.min(1, dt * 6);
      } else {
        this.current[i] = this.target[i];
      }
    }

    if (moved || !settled || this.dirty) {
      if (this.uTime) gl.uniform1f(this.uTime, this.time);
      if (this.uColor) gl.uniform3f(this.uColor, this.current[0], this.current[1], this.current[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      this.dirty = false;
    }

    this.raf = requestAnimationFrame(this.loop);
  };

  FluidOrb.prototype.destroy = function () {
    cancelAnimationFrame(this.raf);
    if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  };

  window.FluidOrb = FluidOrb;
})();
