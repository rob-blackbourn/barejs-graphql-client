export default function graphqlEventSourceSubscriber (url, query, variables, operationName, onError, onSuccess) {
  let subscriptionUrl = url + '?query=' + encodeURIComponent(query)
  if (variables) {
    subscriptionUrl += '&variables=' + encodeURIComponent(JSON.stringify(variables))
  }
  if (operationName) {
    subscriptionUrl += '&operationName=' + encodeURIComponent(operationName)
  }

  const eventSource = new EventSource(subscriptionUrl)
  eventSource.onmessage = event => onSuccess(JSON.parse(event.data))
  eventSource.onerror = error => onError(error)
  // Return the close function to unsubscribe.
  return eventSource.close
}
