function makeWriteableEventStream (eventTarget) {
  return new WritableStream({
    start (controller) {
      eventTarget.dispatchEvent(new Event('close'))
    },
    write (chunk, controller) {
      console.log('event-stream', chunk)
      eventTarget.dispatchEvent(new MessageEvent(chunk.type, chunk.details))
    },
    close (controller) {
      eventTarget.dispatchEvent(new Event('close'))
    },
    abort (reason) {
      eventTarget.dispatchEvent(new CustomEvent('abort', { detail: reason }))
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

function fetchEventTarget (input, init) {
  const eventTarget = new EventTarget()
  // const sseDecoder = makeSseDecoder(input)
  const jsonDecoder = makeJsonDecoder(input)
  const stream = makeWriteableEventStream(eventTarget)
  fetch(input, init)
    .then(response => {
      response.body
        // eslint-disable-next-line no-undef
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(jsonDecoder)
        .pipeTo(stream)
    })
    .catch(error => {
      eventTarget.dispatchEvent(new CustomEvent('error', { detail: error }))
    })
  return eventTarget
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
      console.log(response)
      if (response.status === 200) {
        // This is a query result, so just show the data.
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
        const eventSource = fetchEventTarget(location, {
          method: 'POST',
          headers: new Headers({
            allow: method,
            'content-type': 'application/json',
            accept: 'application/json'
          }),
          mode: 'cors',
          body,
          signal: abortController.signal
        })
        eventSource.addEventListener('message', (event) => {
          onNext(event.data)
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
