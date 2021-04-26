import { CoordinatesEngine } from '../CoordinatesEngine'
import { ConfigResolverMap } from '../../imports'
import { dragConfigResolver } from '../../config/dragConfigResolver'
import { coordinatesConfigResolver } from '../../config/coordinatesConfigResolver'
import { call } from '../../utils/fn'

ConfigResolverMap.set('drag', dragConfigResolver)

export function DragEngine(...args) {
  CoordinatesEngine.call(this, ...args, 'drag')
  this.ingKey = 'dragging'
}

DragEngine.prototype = Object.create(CoordinatesEngine.prototype)

// superseeds generic Engine reset call
DragEngine.prototype.reset = function () {
  CoordinatesEngine.prototype.reset.call(this)
  const state = this.state
  state._pointerId = undefined
  state._pointerActive = false
  state._keyboardActive = false
  state.tap = false
  state.canceled = false
  state.cancel = this.cancel.bind(this)
}

DragEngine.prototype.setup = function (event) {
  const state = this.state
  let bounds = call(this.config.bounds, state)

  if (bounds instanceof HTMLElement) {
    const boundRect = bounds.getBoundingClientRect()
    const targetRect = event.currentTarget.getBoundingClientRect()
    bounds = {
      left: boundRect.left - targetRect.left,
      right: boundRect.right - targetRect.right,
      top: boundRect.top - targetRect.top,
      bottom: boundRect.bottom - targetRect.bottom
    }
  }
  state._bounds = coordinatesConfigResolver.bounds(bounds)
}

DragEngine.prototype.cancel = function () {
  const state = this.state
  if (state.canceled) return
  setTimeout(() => {
    state.canceled = true
    state._active = false
    // we run compute with no event so that kinematics won't be computed
    this.compute()
    this.emit()
  }, 0)
}

DragEngine.prototype.setActive = function ({ pointer, keyboard } = {}) {
  this.state._active = (pointer ?? this.state._pointerActive) || (keyboard ?? this.state._keyboardActive)
}

// superseeds Engine clean function
DragEngine.prototype.clean = function () {
  this.pointerClean()
  this.state._pointerActive = false
  this.state._keyboardActive = false
  CoordinatesEngine.prototype.clean.call(this)
}

DragEngine.prototype.bind = function (bindFunction) {
  const device = this.config.device

  bindFunction(device, 'start', this.pointerDown.bind(this))
  bindFunction('key', 'down', this.keyDown.bind(this))
  bindFunction('key', 'up', this.keyUp.bind(this))

  if (this.config.r3f) {
    bindFunction(device, 'change', this.pointerMove.bind(this))
    bindFunction(device, 'end', this.pointerUp.bind(this))
  }
  if (this.config.filterTaps) {
    bindFunction('click', '', this.click.bind(this), { capture: true })
  }
}