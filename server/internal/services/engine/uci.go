package engine

import (
	"bufio"
	"fmt"
	"os/exec"
	"strings"
	"sync"
)

type Engine struct {
	cmd    *exec.Cmd
	stdin  *bufio.Writer
	stdout *bufio.Scanner
	mu     sync.Mutex
}

func NewEngine(path string) (*Engine, error) {
	cmd := exec.Command(path)
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}

	if err := cmd.Start(); err != nil {
		return nil, err
	}

	return &Engine{
		cmd:    cmd,
		stdin:  bufio.NewWriter(stdin),
		stdout: bufio.NewScanner(stdout),
	}, nil
}

func (e *Engine) SendCommand(cmd string) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	_, err := e.stdin.WriteString(cmd + "\n")
	if err != nil {
		return err
	}
	return e.stdin.Flush()
}

func (e *Engine) GetBestMove(fen string, depth int) (string, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Reset and set position
	e.stdin.WriteString("ucinewgame\n")
	e.stdin.WriteString(fmt.Sprintf("position fen %s\n", fen))
	e.stdin.WriteString(fmt.Sprintf("go depth %d\n", depth))
	e.stdin.Flush()

	// Read output until bestmove
	for e.stdout.Scan() {
		line := e.stdout.Text()
		if strings.HasPrefix(line, "bestmove") {
			parts := strings.Split(line, " ")
			if len(parts) >= 2 {
				return parts[1], nil
			}
			return "", fmt.Errorf("invalid bestmove line: %s", line)
		}
	}

	if err := e.stdout.Err(); err != nil {
		return "", err
	}

	return "", fmt.Errorf("engine closed unexpectedly")
}

func (e *Engine) GetBestMoveFromHistory(moves []string, depth int) (string, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Reset and set position with history
	// "position startpos moves e2e4 e7e5 ..."
	cmd := "position startpos"
	if len(moves) > 0 {
		cmd += " moves " + strings.Join(moves, " ")
	}

	e.stdin.WriteString("ucinewgame\n")
	e.stdin.WriteString(cmd + "\n")
	e.stdin.WriteString(fmt.Sprintf("go depth %d\n", depth))
	e.stdin.Flush()

	// Read output until bestmove
	for e.stdout.Scan() {
		line := e.stdout.Text()
		if strings.HasPrefix(line, "bestmove") {
			parts := strings.Split(line, " ")
			if len(parts) >= 2 {
				return parts[1], nil
			}
			return "", fmt.Errorf("invalid bestmove line: %s", line)
		}
	}

	if err := e.stdout.Err(); err != nil {
		return "", err
	}

	return "", fmt.Errorf("engine closed unexpectedly")
}

func (e *Engine) Close() {
	if e.cmd != nil {
		e.cmd.Process.Kill()
	}
}
