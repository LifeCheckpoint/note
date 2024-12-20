;(function(){

'use strict'
function getDefault(val, defaultVal) {
  if (val !== undefined) return val
  return defaultVal
}

function Plot(el, config={}) {
  const canvas = this.canvas = document.getElementById(el)

  // 移动端分辨率处理
  this.width = canvas.offsetWidth
  this.height = canvas.offsetHeight
  const dpr = window.devicePixelRatio
  canvas.setAttribute('width', this.width * dpr)
  canvas.setAttribute('height', this.height * dpr)
  canvas.style.width = this.width + 'px'
  canvas.style.height = this.height + 'px'
  canvas.style.zoom = 1/dpr

  this.ctx = this.canvas.getContext('2d')
  this.ctx.scale(dpr, dpr)
  this.ctx.font = "12px sans-serif"
  this.color = getDefault(config.color, '#337ab7')

  this.step = getDefault(config.step, 5e-3)
  this.padding = 10
  this.geometry(config)
}

Plot.colors = {
  blue: '#337ab7',
  darkBlue: '#23527c',
  green: '#3c763d',
  lightGreen: '#dff0d8',
  yellow: '#8a6d3b',
  red: '#a94442',
}

Plot.prototype.geometry = function(config) {
  this.xmin = getDefault(config.xmin, -5)
  this.ymin = getDefault(config.ymin, -1)
  this.xmax = getDefault(config.xmax, 5)
  this.ymax = getDefault(config.ymax, 5)
  this.xscale = (this.width-2*this.padding) / (this.xmax-this.xmin)
  this.yscale = (this.height-2*this.padding) / (this.ymax-this.ymin)
  if (config.keepRatio) {
    this.xscale = this.yscale = Math.min(this.xscale, this.yscale)
  }
  return this
}

// 另一种方案是用 css transform: scaleY(-1); 实现上下翻转；
// 问题是，文字也会倒转，这可以用 ctx.scale(1, -1) 补救
Plot.prototype.transform = function(x, y) {
  return [(x-this.xmin)*this.xscale+this.padding, (this.ymax-y)*this.yscale+this.padding]
}

Plot.prototype.moveTo = function(x, y) {
  this.ctx.moveTo(...this.transform(x, y))
  return this
}

Plot.prototype.lineTo = function(x, y) {
  this.ctx.lineTo(...this.transform(x, y))
  return this
}

Plot.prototype.line = function(x0, y0, x1, y1) {
  this.ctx.beginPath()
  this.moveTo(x0, y0)
  this.lineTo(x1, y1)
  this.ctx.stroke()
  return this
}

Plot.prototype.text = function(text, x, y) {
  this.ctx.fillText(text, ...this.transform(x, y))
  return this
}

Plot.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.width, this.height)
  return this
}

function getProperTick(range, pixels) {
  const tick = range * 80 / pixels // 80px per tick
  const properTick = Math.pow(10, Math.floor(Math.log10(tick)))
  const ratio = tick / properTick
  // tick 的大小总是 2, 5, 10 这样的数字
  return properTick * (
    ratio > 4
    ? (ratio > 8 ? 10 : 5)
    : (ratio > 1.5 ? 2 : 1)
  )
}

Plot.prototype.axis = function(config) {
  config = config || {}
  config.xtick = config.xtick || getProperTick(this.xmax-this.xmin, this.width)
  config.ytick = config.ytick || getProperTick(this.ymax-this.ymin, this.height)
  config.xnum = config.xnum || config.xtick
  config.ynum = config.ynum || config.ytick
  const xlabelWidth = this.ctx.measureText(config.xlabel).width

  var origin = this.transform(0, 0)
  this.ctx.strokeStyle = 'black'
  // x 轴
  this.ctx.beginPath()
  this.ctx.moveTo(0, origin[1])
  this.ctx.lineTo(this.width, origin[1])
  this.ctx.stroke()
  if (config.xlabel) this.ctx.fillText(config.xlabel, this.width-xlabelWidth-4, origin[1]-4)
  // y 轴
  this.ctx.beginPath()
  this.ctx.moveTo(origin[0], 0)
  this.ctx.lineTo(origin[0], this.height)
  this.ctx.stroke()
  if(config.ylabel) this.ctx.fillText(config.ylabel, origin[0]+4, 10)

  function myceil(x, step) {
    return Math.ceil(x / step) * step
  }
  // round the labels
  const xround = Math.pow(10, Math.ceil(-Math.log10(config.xtick)))
  const yround = Math.pow(10, Math.ceil(-Math.log10(config.ytick)))
  function myround(x, ratio) {
    return Math.round(x * ratio) / ratio
  }
  // 刻度
  for (var x = myceil(this.xmin, config.xtick); x <= this.xmax; x += config.xtick) {
    if (x !== 0) {
      this.line(x, 0, x, 4/this.yscale)
    }
  }
  for (var y = myceil(this.ymin, config.ytick); y <= this.ymax; y += config.ytick) {
    if (y !== 0) {
      this.line(0, y, 4/this.xscale, y)
    }
  }
  // 数字
  for (var x = myceil(this.xmin, config.xnum); x <= this.xmax; x += config.xnum) {
    this.ctx.save()
    if (x !== 0) {
      this.ctx.translate(-2, 12)
      this.text(''+myround(x, xround), x, 0)
    } else {
      this.ctx.translate(4, 12)
      this.text(''+myround(x, xround), x, 0)
    }
    this.ctx.restore()
  }

  this.ctx.save()
  this.ctx.translate(6, 4)
  for (var y = myceil(this.ymin, config.ynum); y <= this.ymax; y += config.ynum) {
    if (y !== 0) {
      this.text(''+myround(y, yround), 0, y)
    }
  }
  this.ctx.restore()
  return this
}

// 隐函数作图 (400*400, 16ms)
Plot.prototype.plotImp = function (fn, { color, step } = {}) {
  const xb = this.xmin - this.padding / this.xscale
  const yb = this.ymax + this.padding / this.yscale
  const xa = 1 / this.xscale
  const ya = - 1 / this.yscale

  const sign = (x, y) => {
    ++cnt
    const eps = 1e-7
    // x => this.xmin + (x - this.padding) / this.xscale,
    // y => this.ymax - (y - this.padding) / this.yscale
    const f = fn(xa * x + xb, ya * y + yb)
    return f > eps ? 1 : f < -eps ? -1 : 0
  }
  const plot = (xmin, xmax, ymin, ymax, step) => {
    for (let x = xmin; x <= xmax; x += step) {
      for (let y = ymin; y <= ymax; y += step) {
        const s = sign(x, y)
        if (Math.abs(s + sign(x + step, y)) < 2
          || Math.abs(s + sign(x, y + step)) < 2
          || Math.abs(s + sign(x + step, y + step)) < 2) {
          if (step === 1) this.ctx.fillRect(x, y, 1, 1)
          else plot(x, x + step, y, y + step, 1)
        }
      }
    }
  }
  this.ctx.fillStyle = getDefault(color, this.color)
  let cnt = 0
  plot(0, this.width, 0, this.height, step || 8)
  console.log(cnt + ' loops')
  this.ctx.strokeStyle = 'black'
  this.ctx.fillStyle = 'black'
}

// plot discretely
Plot.prototype.discrete = function(f, config={}) {
  var xmin = this.xmin - this.padding / this.xscale
  var xmax = this.xmax + this.padding / this.xscale
  var x = xmin
  var step = getDefault(config.step, this.step)
  this.ctx.strokeStyle = getDefault(config.color, this.color)
  while (x <= xmax) {
    x += step
    this.line(x, f(x), x+step, f(x))
  }
  return this
}

function isPlainObject (o) {
  return Object.prototype.toString.call(o) === '[object Object]'
}

// 散点图
Plot.prototype.plotPoints = function (map, config={}) {
  const keys = Object.keys(map), values = Object.values(map)
  this.geometry({
    xmin: Math.min.apply(null, keys),
    xmax: Math.max.apply(null, keys),
    ymin: Math.min.apply(null, values),
    ymax: Math.max.apply(null, values)
  })

  //var step = getDefault(config.step, this.step)
  //var continuity = getDefault(config.continuity, 100)
  this.ctx.strokeStyle = getDefault(config.color, this.color)
  this.ctx.beginPath()
  let x = this.xmin
  this.moveTo(x, map[x])
  for (x of keys) {
    this.lineTo(x, map[x])
  }
  this.ctx.stroke()
  return this
}

// plot continuously
Plot.prototype.plot = function(f, g, config={}) {
  if (isPlainObject(f)) return this.plotPoints(f, config)
  if (typeof g !== 'function') {
    config = g || {}
    g = f
    f = t => t
  }
  config.min = getDefault(config.min, this.xmin - this.padding / this.xscale)
  config.max = getDefault(config.max, this.xmax + this.padding / this.xscale)
  var t = config.min, x = f(t), y = g(t), prex = x, prey = y
  var step = getDefault(config.step, this.step)
  var continuity = getDefault(config.continuity, 100)
  this.ctx.strokeStyle = getDefault(config.color, this.color)
  this.ctx.beginPath()
  this.moveTo(x, y)
  while (t <= config.max) {
    t += step
    x = f(t)
    y = g(t)
    // 斜率过大处断开
    if (isNaN(x) || isNaN(y)) {
      x = x || 0
      y = y || 0
      this.moveTo(x, y)
    } else if (Math.abs((x-prex)/step) > continuity ||
      Math.abs((y-prey)/step) > continuity) {
      this.moveTo(x, y)
    }
    this.lineTo(x, y)
    prex = x
    prey = y
  }
  this.ctx.stroke()
  return this
}

window.Plot = Plot

})()

/*
var plot = new Plot('canvas', {xmin: -10, ymin: -1, xmax: 10, ymax: 5})
  plot.axis({xnum: 3})
  .plot(Math.floor)
  .plot(x => x*x, {color: Plot.colors.yellow})
  .plot(Math.cos, {color: Plot.colors.green})
  .plot(Math.tan, {color: Plot.colors.red})
  .plot(x => Math.sin(1/x), {color: 'grey', continuity:1e4})

var plot = new Plot('canvas', {xmin: -2, ymin: -2, xmax: 2, ymax: 2, keepRatio: true})
  .axis()
  //.plotImp((x, y) => Math.abs(x) + Math.abs(y) - 1)
  .plotImp((x, y) => 2*Math.abs(2*x+y) + 3*Math.abs(2*x-y) - 2)
  //.plotImp((x, y) => x*x + y*y - 1)
  //.plotImp((x, y) => (x*x + y*y - 1)**3 - x**2 * y**3, { color: 'pink' })
  //.plotImp((x, y) => x*(x+1)**2 + y*(y+1)**2)
  //.plotImp((x, y) => Math.sin(x**2) + Math.sin(y**2) - 1, { step: 1 })
*/
