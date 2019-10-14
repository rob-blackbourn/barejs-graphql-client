function makeWriteableStream (onNext, onError, onComplete) {
  return new WritableStream({
    write (chunk, controller) {
      if (chunk.type === 'message') {
        onNext(chunk.details)
      }
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

function makeJsonDecoder () {
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
            controller.enqueue(JSON.parse(line))
          }
          controller.buf = controller.buf.substring(controller.pos + 1)
          controller.pos = 0
        } else {
          ++controller.pos
        }
      }
    }
  })
}

export default function graphqlStreamClient (url, query, variables, operation, onNext, onError, onComplete) {
  const body = JSON.stringify({
    query, variables, operation
  })
  const method = 'POST'
  const abortController = new AbortController()

  fetch(url, {
    method,
    headers: new Headers({
      allow: method,
      'content-type': 'application/json'
    }),
    mode: 'cors',
    body,
    signal: abortController.signal
  })
    .then(response => {
      if (response.status === 200) {
        // This is a query result, so just show the data.onNext
        response.text()
          .then(text => {
            onNext(text)
            onComplete()
          })
          .catch(error => {
            onError(error)
          })
      } else if (response.status === 201) {
        // This is a subscription response. An endpoint is
        // returned in the "Location" header which we can
        // consume with a streaming fetch.
        const location = response.headers.get('location')
        const init = {
          method,
          headers: new Headers({
            allow: method,
            'content-type': 'application/json',
            accept: 'application/json'
          }),
          mode: 'cors',
          body,
          signal: abortController.signal
        }
        const jsonDecoder = makeJsonDecoder(location)
        const writeableStream = makeWriteableStream(onNext, onError, onComplete)
        fetch(location, init)
          .then(response => {
            response.body
              // eslint-disable-next-line no-undef
              .pipeThrough(new TextDecoderStream())
              .pipeThrough(jsonDecoder)
              .pipeTo(writeableStream)
              .catch(() => {
                // Errors are handled in the writeable stream
              })
          })
          .catch(error => {
            onError(error)
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
