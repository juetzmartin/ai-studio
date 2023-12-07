import { ChildProcess, execFile } from 'child_process'
import pidusage from 'pidusage'

import llamaServer from '../../../resources/llamacpp/server?asset&asarUnpack'

const CONTEXT_SIZE = 4096

export class ElectronLlamaServerManager {
  processes = new Map<string, ChildProcess>()

  loading = new Map<string, Promise<unknown>>()

  async launchServer({
    modelPath,
    mmprojPath,
    multimodal = false,
  }: {
    modelPath: string
    multimodal?: boolean
    mmprojPath?: string
  }) {
    if (this.loading.has(modelPath)) {
      return this.loading.get(modelPath)
    }

    const args = [
      '-m',
      modelPath,
      '-c',
      CONTEXT_SIZE.toString(),
      '-ngl',
      '4',
      '-t',
      '4',
    ]
    if (multimodal && mmprojPath) {
      args.push('--mmproj', mmprojPath)
    }

    const promise = new Promise((resolve, reject) => {
      const process = execFile(llamaServer, args, (err) => {
        if (err) {
          console.error(err)
          reject(err)
          return
        }
      })

      const handler = (data) => {
        const message = data.toString().split('\n')
        message.forEach((line: string) => {
          if (line.length === 0) {
            return
          }
          try {
            const message = JSON.parse(line)
            if (message.message == 'HTTP server listening') {
              process.stdout?.off('data', handler)
              resolve(void undefined)
            }
          } catch {
            // empty
          }
        })
      }

      process.stdout?.on('data', handler)
      this.handleProcess(modelPath, process)
    })

    this.loading.set(modelPath, promise)

    return promise
  }

  private handleProcess(modelPath: string, process: ChildProcess) {
    this.processes.set(modelPath, process)

    process.on('close', () => {
      this.processes.delete(modelPath)
    })

    process.stdout?.on('data', (data) => {
      const message = data.toString().split('\n')
      message.forEach((line: string) => {
        if (line.length === 0) {
          return
        }
        if (!line.trim().startsWith('{')) {
          console.log(line)
          return
        }
        try {
          const message = JSON.parse(line)
          console.group(`[LLAMACPP] Process: ${process.pid}`)
          console.log(message)
          console.groupEnd()
        } catch (err) {
          console.log('Could not parse stdout message:', data.toString(), err)
        }
      })
    })

    this.processes.set(modelPath, process)
  }

  async getModelParameters() {
    const res = await fetch('http://127.0.0.1:8080/model.json')
    const data = await res.json()

    return {
      contextSize: data.n_ctx,
      modelPath: data.model,
    }
  }

  async encode(content: string): Promise<number[]> {
    const res = await fetch('http://127.0.0.1:8080/tokenize', {
      body: JSON.stringify({ content }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    const data = await res.json()
    return data.tokens
  }

  cleanupProcess(modelPath: string) {
    const process = this.processes.get(modelPath)
    if (process) {
      const killed = process.kill()
      if (!killed) {
        process.kill('SIGKILL')
      }
      this.processes.delete(modelPath)
      this.loading.delete(modelPath)
    }
  }

  close() {
    this.processes.forEach((process) => {
      process.kill()
    })
    this.processes.clear()
    this.loading.clear()
  }

  async memoryUsage(): Promise<number> {
    const pids = Array.from(this.processes.values())
      .map((p) => p.pid)
      .filter((p) => p) as number[]
    return new Promise((resolve) => {
      pidusage(pids, (err, stats) => {
        if (err) {
          resolve(0)
        } else {
          resolve(
            Object.values(stats).reduce((acc, curr) => acc + curr.memory, 0),
          )
        }
      })
    })
  }
}