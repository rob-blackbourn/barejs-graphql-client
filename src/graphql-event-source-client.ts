import EventError from './event-error'
import FetchError from './fetch-error'
import mergeDeep from './merge-deep'

/**
 * Create a graphQL client that can be used for Query, Mutation and Subscription, using server sent events.
 * @param {RequestInfo} url - The url to target.
 * @param {RequestInit} init - Extra arguments for fetch.
 * @param {string} query - The query.
 * @param {Object} [variables] - Query variables.
 * @param {string} [operationName] - The name of the operation to invoke.
 * @param {NextValue} onNext - Called when GraphQL provides data.
 * @param {function} onError - Called when an error has occurred.
 * @param {function} onComplete - Called when the operation is complete.
 * @returns {function} - A function that can be called to terminate the operation.
 */
export default function graphqlEventSourceClient(
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
        allow: 'GET',
        'content-type': 'application/json',
        accept: 'application/json'
      },
      signal: abortController.signal,
      body: JSON.stringify({
        query,
        variables,
        operationName
      })
    },
    init
  )

  // Invoke fetch as a POST with the GraphQL content in the body.
  fetch(url, init)
    .then(response => {
      if (response.status === 200) {
        // A 200 response is from a query or mutation.

        response
          .json()
          .then(json => {
            onNext(json)
            onComplete()
          })
          .catch(error => onError(error))
      } else if (response.status === 201) {
        // A 201 is the response for a subscription.

        // The url for the event source is passed in the 'location' header.
        const location = response.headers.get('location')
        if (location == null) {
          throw new Error('Location header missing')
        }

        const eventSource = new EventSource(location)

        eventSource.onmessage = event => {
          const data = JSON.parse(event.data)
          onNext(data)
        }

        eventSource.onerror = error => {
          onError(new EventError(error))
        }

        abortController.signal.onabort = () => {
          if (eventSource.readyState !== 2) {
            eventSource.close()
            onComplete()
          }
        }
      } else {
        onError(new FetchError(response, 'Failed to execute GraphQL'))
      }
    })
    .catch(error => onError(error))

  // Return an unsubscribe function.
  return () => {
    abortController.abort()
  }
}
