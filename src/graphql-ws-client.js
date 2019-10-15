import FetchError from './fetch-error'
// import graphQLSubscriber from './graphql-ws-subscriber'
import graphqlWsSubscriber from './graphql-ws-subscriber'

export default function graphqlWsClient (url, query, variables, operationName, onNext, onError, onComplete) {
  const abortController = new AbortController()

  // Invoke fetch as a POST with the GraphQL content in the body.
  fetch(url, {
    method: 'POST',
    signal: abortController.signal,
    body: JSON.stringify({
      query,
      variables,
      operationName
    })
  })
    .then(response => {
      if (response.status === 200) {
        // A 200 response is from a query or mutation.

        response.json()
          .then(json => {
            onNext(json)
            onComplete()
          })
          .catch(error => onError(error))
      } else if (response.status === 201) {
        // A 201 is the response for a subscription.

        // The url for the event source is passed in the 'location' header.
        const location = response.headers.get('location')
        const index = location.indexOf('?')
        const wsUrl = 'ws' + location.slice(4, index === -1 ? undefined : index)

        const unsubscribe = graphqlWsSubscriber(wsUrl, query, variables, operationName, onNext, onError, onComplete)

        abortController.signal.onabort = () => {
          unsubscribe()
        }
      } else {
        onError(new FetchError(response, 'Failed to execute GraphQL'))
      }
    })
    .catch(error => {
      onError(error)
    })

  // Return an unsubscribe function.
  return () => {
    abortController.abort()
  }
}
