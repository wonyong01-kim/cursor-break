import { useEffect, useRef, useState } from 'react'
import './App.css'

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 520
const PADDLE_WIDTH = 120
const PADDLE_HEIGHT = 16
const BALL_RADIUS = 8
const BASE_SPEED = 4.2
const BRICK_ROWS = 5
const BRICK_COLS = 9
const BRICK_WIDTH = 60
const BRICK_HEIGHT = 24
const BRICK_GAP = 10
const BRICK_OFFSET_TOP = 60
const BRICK_OFFSET_LEFT = 32

const BRICK_COLORS = ['#ffda79', '#ff9f68', '#ef5b5b', '#59c9a5', '#64b5ff']

const createBallState = (speedMultiplier = 1) => {
  const speed = BASE_SPEED * speedMultiplier
  const direction = Math.random() > 0.5 ? 1 : -1
  return {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 90,
    dx: speed * 0.7 * direction,
    dy: -speed,
  }
}

const buildBricks = () => {
  const bricks = []
  for (let row = 0; row < BRICK_ROWS; row += 1) {
    for (let col = 0; col < BRICK_COLS; col += 1) {
      const x = BRICK_OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_GAP)
      const y = BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_GAP)
      bricks.push({
        x,
        y,
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        destroyed: false,
        color: BRICK_COLORS[row % BRICK_COLORS.length],
      })
    }
  }
  return bricks
}

function App() {
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [isRunning, setIsRunning] = useState(false)
  const [message, setMessage] = useState('스페이스바를 눌러 시작해요!')
  const [speedMultiplier, setSpeedMultiplier] = useState(1)

  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const bricksRef = useRef(buildBricks())
  const bricksLeftRef = useRef(bricksRef.current.length)
  const ballRef = useRef(createBallState())
  const paddleXRef = useRef((CANVAS_WIDTH - PADDLE_WIDTH) / 2)
  const keysRef = useRef({ left: false, right: false })
  const scoreRef = useRef(0)

  const ensureDraw = () => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      drawScene(ctx)
    }
  }

  const stopLoop = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    setIsRunning(false)
  }

  const applySpeedToBall = (multiplier) => {
    const ball = ballRef.current
    const magnitude = Math.hypot(ball.dx, ball.dy)
    if (!magnitude) return
    const newSpeed = BASE_SPEED * multiplier
    ball.dx = (ball.dx / magnitude) * newSpeed
    ball.dy = (ball.dy / magnitude) * newSpeed
  }

  const resetBall = () => {
    Object.assign(ballRef.current, createBallState(speedMultiplier))
    paddleXRef.current = (CANVAS_WIDTH - PADDLE_WIDTH) / 2
  }

  const resetGame = () => {
    stopLoop()
    bricksRef.current = buildBricks()
    bricksLeftRef.current = bricksRef.current.length
    scoreRef.current = 0
    setScore(0)
    setLives(3)
    setMessage('스페이스바를 눌러 시작해요!')
    resetBall()
    ensureDraw()
  }

  const bumpScore = (amount = 10) => {
    scoreRef.current += amount
    setScore(scoreRef.current)
    setBestScore((best) => Math.max(best, scoreRef.current))
  }

  const handleLifeLost = () => {
    stopLoop()
    setLives((prev) => {
      const next = Math.max(prev - 1, 0)
      if (next === 0) {
        setMessage('게임 오버! 새 게임 버튼이나 R키로 다시 시작하세요')
        setBestScore((best) => Math.max(best, scoreRef.current))
      } else {
        setMessage(`남은 목숨 ${next}개! 스페이스바로 계속`)
      }
      return next
    })
    resetBall()
    ensureDraw()
  }

  const handleWin = () => {
    stopLoop()
    setMessage('모든 벽돌을 깼어요! 새 게임 버튼으로 다시 도전해요')
    setBestScore((best) => Math.max(best, scoreRef.current))
    ensureDraw()
  }

  const startGame = () => {
    if (isRunning || lives === 0 || bricksLeftRef.current === 0) return
    setMessage('')
    setIsRunning(true)
  }

  const pauseGame = () => {
    if (!isRunning) return
    stopLoop()
    setMessage('일시정지! 스페이스바로 계속')
  }

  const updateBricksCollision = () => {
    const ball = ballRef.current
    for (const brick of bricksRef.current) {
      if (brick.destroyed) continue
      const withinX =
        ball.x + BALL_RADIUS > brick.x &&
        ball.x - BALL_RADIUS < brick.x + brick.width
      const withinY =
        ball.y + BALL_RADIUS > brick.y &&
        ball.y - BALL_RADIUS < brick.y + brick.height
      if (withinX && withinY) {
        brick.destroyed = true
        bricksLeftRef.current -= 1

        const overlapLeft = ball.x + BALL_RADIUS - brick.x
        const overlapRight = brick.x + brick.width - (ball.x - BALL_RADIUS)
        const overlapTop = ball.y + BALL_RADIUS - brick.y
        const overlapBottom =
          brick.y + brick.height - (ball.y - BALL_RADIUS)
        const minOverlap = Math.min(
          overlapLeft,
          overlapRight,
          overlapTop,
          overlapBottom,
        )

        if (minOverlap === overlapLeft || minOverlap === overlapRight) {
          ball.dx = -ball.dx
        } else {
          ball.dy = -ball.dy
        }

        bumpScore()

        if (bricksLeftRef.current === 0) {
          handleWin()
        }
        break
      }
    }
  }

  const advanceFrame = () => {
    const ball = ballRef.current
    const paddleTop = CANVAS_HEIGHT - PADDLE_HEIGHT - 12

    if (keysRef.current.left) {
      paddleXRef.current = Math.max(paddleXRef.current - 7, 0)
    }
    if (keysRef.current.right) {
      paddleXRef.current = Math.min(
        paddleXRef.current + 7,
        CANVAS_WIDTH - PADDLE_WIDTH,
      )
    }

    ball.x += ball.dx
    ball.y += ball.dy

    if (ball.x + BALL_RADIUS >= CANVAS_WIDTH || ball.x - BALL_RADIUS <= 0) {
      ball.dx = -ball.dx
      ball.x = Math.min(
        Math.max(ball.x, BALL_RADIUS),
        CANVAS_WIDTH - BALL_RADIUS,
      )
    }

    if (ball.y - BALL_RADIUS <= 0) {
      ball.dy = -ball.dy
      ball.y = BALL_RADIUS
    }

    if (
      ball.y + BALL_RADIUS >= paddleTop &&
      ball.y + BALL_RADIUS <= paddleTop + PADDLE_HEIGHT &&
      ball.x >= paddleXRef.current &&
      ball.x <= paddleXRef.current + PADDLE_WIDTH &&
      ball.dy > 0
    ) {
      const collidePoint =
        ball.x - (paddleXRef.current + PADDLE_WIDTH / 2)
      const normalized = collidePoint / (PADDLE_WIDTH / 2)
      const maxBounce = Math.PI / 3
      const bounceAngle = normalized * maxBounce
      const speed = Math.hypot(ball.dx, ball.dy) || BASE_SPEED * speedMultiplier

      ball.dx = speed * Math.sin(bounceAngle)
      ball.dy = -Math.abs(speed * Math.cos(bounceAngle))
      ball.y = paddleTop - BALL_RADIUS - 1
    }

    if (ball.y - BALL_RADIUS > CANVAS_HEIGHT) {
      handleLifeLost()
      return
    }

    updateBricksCollision()
  }

  const drawScene = (ctx) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    gradient.addColorStop(0, '#040b2f')
    gradient.addColorStop(1, '#020413')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    bricksRef.current.forEach((brick) => {
      if (brick.destroyed) return
      ctx.fillStyle = brick.color
      ctx.shadowColor = brick.color
      ctx.shadowBlur = 12
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height)
      ctx.shadowBlur = 0
    })

    ctx.fillStyle = '#f4f7ff'
    ctx.fillRect(
      paddleXRef.current,
      CANVAS_HEIGHT - PADDLE_HEIGHT - 12,
      PADDLE_WIDTH,
      PADDLE_HEIGHT,
    )

    const ball = ballRef.current
    ctx.beginPath()
    ctx.fillStyle = '#8defff'
    ctx.shadowColor = '#8defff'
    ctx.shadowBlur = 16
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }

  useEffect(() => {
    ensureDraw()
  }, [])

  useEffect(() => {
    if (!isRunning) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const frame = () => {
      advanceFrame()
      drawScene(ctx)
      animationRef.current = requestAnimationFrame(frame)
    }

    animationRef.current = requestAnimationFrame(frame)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [isRunning])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        keysRef.current.left = true
      }
      if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        keysRef.current.right = true
      }
      if (event.code === 'Space') {
        event.preventDefault()
        if (isRunning) {
          pauseGame()
        } else {
          startGame()
        }
      }
      if (event.code === 'KeyR') {
        event.preventDefault()
        resetGame()
      }
    }

    const handleKeyUp = (event) => {
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        keysRef.current.left = false
      }
      if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        keysRef.current.right = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isRunning])

  useEffect(() => {
    applySpeedToBall(speedMultiplier)
  }, [speedMultiplier])

  const handleSpeedChange = (event) => {
    setSpeedMultiplier(Number(event.target.value))
  }

  return (
    <div className="game-shell">
      <header className="scoreboard">
        <div className="score-card primary">
          <span className="label">SCORE</span>
          <strong>{score}</strong>
        </div>
        <div className="score-card">
          <span className="label">BEST</span>
          <strong>{bestScore}</strong>
        </div>
        <div className="score-card">
          <span className="label">LIVES</span>
          <strong>{lives}</strong>
        </div>
      </header>

      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          aria-label="벽돌깨기 게임 보드"
        />
        {message && (
          <div className="message-overlay">
            <p>{message}</p>
          </div>
        )}
      </div>

      <div className="controls">
        <button
          type="button"
          className="primary"
          onClick={() => (isRunning ? pauseGame() : startGame())}
          disabled={lives === 0 || bricksLeftRef.current === 0}
        >
          {isRunning ? '일시정지' : '시작 / 재개'}
        </button>
        <button type="button" onClick={resetGame}>
          새 게임
        </button>
      </div>

      <section className="settings-panel" aria-label="게임 설정">
        <div className="settings-header">
          <div>
            <p className="settings-label">공 속도</p>
            <strong>느림 ↔ 빠름</strong>
          </div>
          <span className="speed-chip">{speedMultiplier.toFixed(1)}x</span>
        </div>
        <label className="range-field">
          <span>0.6x</span>
          <input
            type="range"
            min="0.6"
            max="1.6"
            step="0.1"
            value={speedMultiplier}
            onChange={handleSpeedChange}
            aria-label="공 속도 배율"
          />
          <span>1.6x</span>
        </label>
        <p className="settings-hint">
          느리게 연습하거나 빠르게 도전하면서 자신만의 난이도를 찾아보세요.
        </p>
      </section>

      <ul className="tips">
        <li>← → 또는 A / D 키로 패들을 움직여요</li>
        <li>스페이스바로 시작 · 일시정지, R키로 즉시 리셋</li>
        <li>설정창에서 공 속도를 즉시 조절할 수 있어요</li>
      </ul>
    </div>
  )
}

export default App
