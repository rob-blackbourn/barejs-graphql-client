export default function graphqlEventSourceSubscriber (url, query, variables, operationName, onNext, onError, onComplete) {
  let subscriptionUrl = url + '?query=' + encodeURIComponent(query)
  if (variables) {
    subscriptionUrl += '&variables=' + encodeURIComponent(JSON.stringify(variables))
  }
  if (operationName) {
    subscriptionUrl += '&operationName=' + encodeURIComponent(operationName)
  }

  const eventSource = new EventSource(subscriptionUrl)

  eventSource.onmessage = event => {
    const data = JSON.parse(event.data)
    onNext(data)
  }

  eventSource.onerror = error => {
    onError(error)
  }

  const abortController = new AbortController()
  abortController.signal.onabort = () => {
    if (eventSource.readyState !== 2) {
      eventSource.close()
      onComplete()
    }
  }

  return abortController.abort
}
