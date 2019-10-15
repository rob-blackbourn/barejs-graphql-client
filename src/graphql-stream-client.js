function makeWriteableStream (onNext, onError, onComplete) {
  return new WritableStream({
    write (chunk, controller) {
      onNext(chunk)
    },
    close (controller) {
      onComplete()
    },
    abort (reason) {
      if (reason.name === 'AbortError') {
        onComplete()
      } else {
        onError(reason)
      }
    }
  })
}

function makeLineDecoder () {
  // eslint-disable-next-line no-undef
  return new TransformStream({
    start (controller) {
      controller.buf = ''
      controller.pos = 0
    },
    transform (chunk, controller) {
      controller.buf += chunk
      while (controller.pos < controller.buf.length) {
        if (controller.buf[controller.pos] === '\n') {
          const line = controller.buf.substring(0, controller.pos)
          if (line !== '') {
            controller.enqueue(line)
          }
          controller.buf = controller.buf.substring(controller.pos + 1)
          controller.pos = 0
        } else {
          ++controller.pos
        }
      }
    },
    flush (controller) {
      if (controller.pos !== 0) {
        controller.enqueue(controller.buf)
      }
    }
  })
}

export default function graphqlStreamClient (url, query, variables, operationName, onNext, onError, onComplete) {
  const body = JSON.stringify({
    query, variables, operationName
  })
  const method = 'POST'
  const abortController = new AbortController()

  fetch(url, {
    method,
    headers: new Headers({
      allow: method,
      'content-type': 'application/json',
      accept: 'application/json'
    }),
    mode: 'cors',
    body,
    signal: abortController.signal
  })
    .then(response => {
      if (response.status === 200) {
        // A streaming response is a subscription.
        const lineDecoder = makeLineDecoder()
        const writeableStream = makeWriteableStream(onNext, onError, onComplete)

        response.body
        // eslint-disable-next-line no-undef
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(lineDecoder)
          // eslint-disable-next-line no-undef
          .pipeThrough(new TransformStream({
            transform (chunk, controller) {
              controller.enqueue(JSON.parse(chunk))
            }
          }))
          .pipeTo(writeableStream)
          .catch(() => {
            // Errors are handled in the writeable stream
          })
      } else {
        onError(new Error('Unhandled response'))
      }
    })
    .catch(error => {
      onError(error)
    })

  // Return a method to stop the request.
  return () => abortController.abort()
}
