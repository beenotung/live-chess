import { Link } from '../components/router.js'
import { o } from '../jsx/jsx.js'
import SourceCode from '../components/source-code.js'
import { mapArray } from '../components/fragment.js'
import { Style } from '../components/style.js'
import { EarlyTerminate } from '../helpers.js'
import { Node } from '../jsx/types.js'
import { castDynamicContext, Context } from '../context.js'
import { getContextSearchParams } from '../routes.js'
import { ServerMessage } from '../../../client/types.js'
import { sessions } from '../session.js'
import {
  Cell,
  getBoard,
  getCell,
  Player,
  resetBoard,
  setCell,
  X,
  Y,
} from '../../../db/game-store.js'
import { VElement } from '../../../client/jsx/types.js'
import { nodeToVNode } from '../jsx/vnode.js'

let currentPlayer: Player = 'yellow'

function sendMessage(message: ServerMessage) {
  sessions.forEach(session => {
    session.ws.send(message)
  })
}

function handleCellClick(attrs: {}, context: Context): Node {
  let params = getContextSearchParams(castDynamicContext(context))
  let y = +params.get('y')!
  let x = +params.get('x')!

  // validate input
  if (getCell(x, y) !== 'empty') {
    throw EarlyTerminate
  }
  let board = getBoard()
  let winner = findAnyWinner(board)
  if (winner) {
    sendMessage(['update-in', '#winner-box', Winner({ player: currentPlayer })])
    throw EarlyTerminate
  }

  // find next slot
  while (
    y + 1 < Y &&
    getCell(x, y) === 'empty' &&
    getCell(x, y + 1) === 'empty'
  ) {
    y++
  }

  // update board
  setCell(x, y, currentPlayer)
  let message: ServerMessage = [
    'update-in',
    `[data-x="${x}"][data-y="${y}"]`,
    <span class={'cell ' + currentPlayer} title={currentPlayer}></span>,
  ]
  sendMessage(message)

  // check winner
  board[y][x] = currentPlayer
  if (findAnyWinner(board)) {
    sendMessage(['update-in', '#winner-box', Winner({ player: currentPlayer })])
    throw EarlyTerminate
  }

  // set next player
  switch (currentPlayer) {
    case 'yellow':
      currentPlayer = 'red'
      break
    case 'red':
      currentPlayer = 'yellow'
      break
  }
  sendMessage(['update-text', '#current-player-name', currentPlayer])

  throw EarlyTerminate
}

// [x,y][][]
let masks = [
  /* down */
  [
    [0, +1],
    [0, +2],
    [0, +3],
  ],
  /* up */
  [
    [0, -1],
    [0, -2],
    [0, -3],
  ],
  /* right */
  [
    [+1, 0],
    [+2, 0],
    [+3, 0],
  ],
  /* left */
  [
    [-1, 0],
    [-2, 0],
    [-3, 0],
  ],
  /* \ direction */
  [
    [+1, +1],
    [+2, +2],
    [+3, +3],
  ],
  [
    [-1, -1],
    [-2, -2],
    [-3, -3],
  ],
  /* / direction */
  [
    [-1, +1],
    [-2, +2],
    [-3, +3],
  ],
  [
    [+1, -1],
    [+2, -2],
    [+3, -3],
  ],
]

function findWinnerHelper(board: Cell[][], cx: number, cy: number): Player | null {
  let player = board[cy][cx]
  if (player === 'empty') return null

  for (let mask of masks) {
    let acc = 0
    for (let [dx, dy] of mask) {
      let x = cx + dx
      let y = cy + dy
      if (board[y]?.[x] != player) break
      acc++
    }
    if (acc === 3) return player
  }

  return null
}

function findAnyWinner(board: Cell[][]): Player | null {
  for (let y = 0; y < Y; y++) {
    for (let x = 0; x < X; x++) {
      let winner = findWinnerHelper(board, x, y)
      if (winner) return winner
    }
  }
  return null
}

function handleBoardReset(attrs: {}, context: Context) {
  resetBoard()
  let vnode = nodeToVNode(<Home />, context)
  sendMessage(['update', vnode])
  return <Home />
}

let style = Style(/* css */ `
.board {
  border: 1px solid black;
  display: inline-block;
  margin-top: 0.5rem;
  margin-bottom: 1rem;
}
.row {
  border: 1px solid black;
  display: block;
}
.col {
  border: 1px solid black;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 50px;
  height: 50px;
  max-width: 11vw;
  max-height: 11vw;
}
.cell {
  border: 1px solid black;
  border-radius: 100%;
  width: 40px;
  height: 40px;
  max-width: 8vw;
  max-height: 8vw;
  display: inline-flex;
  justify-content: center;
  align-items: center;
}
.cell.yellow {
  background-color: yellow;
  color: yellow;
}
.cell.red {
  background-color: red;
  color: red;
}
.cell.empty {
  background-color: gray;
  color: gray;
}
`)

let Home = (): VElement => {
  let board = getBoard()
  let winner = findAnyWinner(board)
  return [
    '#home',
    {},
    [
      <>
        <div id="home">
          {style}
          <h2>four-chain chess</h2>
          <div class="players">
            Current Player: <b id="current-player-name">{currentPlayer}</b>
          </div>
          <div id="winner-box">
            {winner ? <Winner player={winner} /> : null}
          </div>
          <div style="margin: 0.5rem 0">
            <Link no-history href="/board/reset">
              <button>Reset Board</button>
            </Link>
          </div>
          <div class="board">
            {mapArray(board, (row, y) => (
              <div class="row">
                {mapArray(row, (cell, x) => (
                  <div class="col" data-x={x} data-y={y}>
                    {!winner && cell == 'empty' ? (
                      <Link
                        no-history
                        class={'cell ' + cell}
                        href={`/cell/click?x=${x}&y=${y}`}
                        title={cell}
                      >
                        {' '}
                      </Link>
                    ) : (
                      <span class={'cell ' + cell} title={cell}></span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <SourceCode page="home.tsx" />
        </div>
      </>,
    ],
  ]
}

let Winner = (attrs: { player: Player }) => {
  return (
    <span>
      Winner: <b>{attrs.player}</b>
    </span>
  )
}

export default { Index: Home, handleCellClick, handleBoardReset }
