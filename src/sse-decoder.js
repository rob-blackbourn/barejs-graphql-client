const bom = ['\xEF', '\xBB', '\xBF']
const colon = ':'
const space = ' '
const lineFeed = '\n'
const carriageReturn = '\r'

function hasBom (buf) {
  return bom.every(function (charCode, index) {
    return buf[index] === charCode
  })
}

export default class SseDecoder {
  constructor (url) {
    this.url = url
    this.isFirst = true
    this.buf = undefined
    this.discardTrailingNewline = false
    this.data = ''
    this.eventName = ''
  }

  decode (chunk) {
    let results = []

    this.buf = this.buf ? this.buf + chunk : chunk
    if (this.isFirst && hasBom(this.buf)) {
      this.buf = this.buf.slice(bom.length)
    }

    this.isFirst = false
    let pos = 0

    while (pos < this.buf.length) {
      if (this.discardTrailingNewline) {
        if (this.buf[pos] === lineFeed) {
          ++pos
        }
        this.discardTrailingNewline = false
      }

      let lineLength = -1
      var fieldLength = -1

      for (let i = pos; lineLength < 0 && i < this.buf.length; ++i) {
        const c = this.buf[i]
        if (c === colon) {
          if (fieldLength < 0) {
            fieldLength = i - pos
          }
        } else if (c === carriageReturn) {
          this.discardTrailingNewline = true
          lineLength = i - pos
        } else if (c === lineFeed) {
          lineLength = i - pos
        }
      }

      if (lineLength < 0) {
        break
      }

      const latestResults = this.parseEventStreamLine(this.buf, pos, fieldLength, lineLength)
      results = results.concat(latestResults)

      pos += lineLength + 1
    }

    if (pos === this.buf.length) {
      this.buf = undefined
    } else if (pos > 0) {
      this.buf = this.buf.slice(pos)
    }

    return results
  }

  parseEventStreamLine (buf, pos, fieldLength, lineLength) {
    const results = []

    if (lineLength === 0) {
      if (this.data.length > 0) {
        results.push({
          type: this.eventName || 'message',
          data: this.data.slice(0, -1), // remove trailing newline
          lastEventId: this.lastEventId,
          origin: this.url
        })
        this.data = ''
      }
      this.eventName = null
    } else if (fieldLength > 0) {
      const noValue = fieldLength < 0
      let step = 0
      const field = buf.slice(pos, pos + (noValue ? lineLength : fieldLength)).toString()

      if (noValue) {
        step = lineLength
      } else if (buf[pos + fieldLength + 1] !== space) {
        step = fieldLength + 1
      } else {
        step = fieldLength + 2
      }
      pos += step

      const valueLength = lineLength - step
      const value = buf.slice(pos, pos + valueLength).toString()

      if (field === 'data') {
        this.data += value + '\n'
      } else if (field === 'event') {
        this.eventName = value
      } else if (field === 'id') {
        this.lastEventId = value
      } else if (field === 'retry') {
        var retry = parseInt(value, 10)
        if (!Number.isNaN(retry)) {
          self.reconnectInterval = retry
        }
      }
    }

    return results
  }
}
