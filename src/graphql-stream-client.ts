/* global TransformStream */

import FetchError from './fetch-error'
import mergeDeep from './merge-deep'

function makeWriteableStream(
  onNext: (response: any) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): WritableStream {
  return new WritableStream({
    write(chunk, _controller: WritableStreamDefaultController): void {
      onNext(chunk)
    },
    close(): void | PromiseLike<void> {
      onComplete()
    },
    abort(reason: Error): void {
      if (reason.name === 'AbortError') {
        onComplete()
      } else {
        onError(reason)
      }
    }
  })
}

class LineTransformer implements Transformer<string,object> {
  #buf: string = ''
  #pos: number = 0

  start(controller: TransformStreamDefaultController): void {
    this.#buf = ''
    this.#pos = 0
  }

  transform(chunk: string, controller: TransformStreamDefaultController): void {
    this.#buf += chunk
    while (this.#pos < this.#buf.length) {
      if (this.#buf[this.#pos] === '\n') {
        const line = this.#buf.substring(0, this.#pos)
        if (line !== '') {
          controller.enqueue(line)
        }
        this.#buf = this.#buf.substring(this.#pos + 1)
        this.#pos = 0
      } else {
        ++this.#pos
      }
    }
  }

  flush(controller: TransformStreamDefaultController): void {
    if (this.#pos !== 0) {
      controller.enqueue(this.#buf)
    }
  }
}

function makeLineDecoder(): TransformStream {
  return new TransformStream(new LineTransformer())
}

/**
 * A GraphQL client using a streaming fetch. This can support Query, Mutation, and Subscription.
 * @param {RequestInfo} url - The GraphQL url.
 * @param {RequestInit} init - Additional parameters passed to fetch.
 * @param {string} query - The GraphQL query.
 * @param {Object} [variables] - Any variables required by the query.
 * @param {string} [operationName] - The name of the operation to invoke,
 * @param {function} onNext - The function called when data is provided.
 * @param {function} onError - The function called when an error occurs.
 * @param {function} onComplete - The function called when the operation has completed.
 * @returns {function} - A function that can be called to terminate the operation.
 */
export default function graphqlStreamClient(
  url: RequestInfo,
  init: RequestInit,
  query: string,
  variables: object,
  operationName: string | null,
  onNext: (response: any) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): () => void {
  const abortController = new AbortController()

  init = mergeDeep(
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        allow: 'POST'
      },
      body: JSON.stringify({
        query,
        variables,
        operationName
      }),
      signal: abortController.signal
    },
    init
  )

  fetch(url, init)
    .then(response => {
      if (response.status === 200 && response.body !== null) {
        // A streaming response is a subscription.
        const lineDecoder = makeLineDecoder()
        const writeableStream = makeWriteableStream(onNext, onError, onComplete)

        response.body
          // eslint-disable-next-line no-undef
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(lineDecoder)
          // eslint-disable-next-line no-undef
          .pipeThrough(
            new TransformStream({
              transform(chunk, controller) {
                controller.enqueue(JSON.parse(chunk))
              }
            })
          )
          .pipeTo(writeableStream)
          .catch(() => {
            // Errors are handled in the writeable stream
          })
      } else {
        onError(new FetchError(response, 'Unhandled response'))
      }
    })
    .catch(error => {
      onError(error)
    })

  // Return a method to stop the request.
  return () => abortController.abort()
}
