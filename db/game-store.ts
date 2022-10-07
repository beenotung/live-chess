import { proxy } from './proxy.js'

export type Cell = Player | 'empty'

export function getCell(x: number, y: number): Cell {
  let id = y * 10 + x
  let player = proxy.cell[id]?.player || 'empty'
  return player as Cell
}

export function setCell(x: number, y: number, player: Cell) {
  let id = y * 10 + x
  proxy.cell[id] = { player }
}

export let Y = 6
export let X = 7

export type Player = 'yellow' | 'red'
export function getBoard() {
  let board = new Array(Y)
    .fill(0)
    .map((_, y) => new Array(X).fill(0).map((_, x) => getCell(x, y)))
  return board
}

export function resetBoard() {
  proxy.cell.length = 0
  delete proxy.cell[0]
}
