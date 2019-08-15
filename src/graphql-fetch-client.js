import FetchError from './fetch-error'

export default function graphqlFetchClient (url, init, query, variables, operationName, onError, onSuccess) {
  fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      query,
      variables,
      operationName
    }),
    ...init
  })
    .then(response => {
      if (response.ok) {
        response.json()
          .then(json => {
            onSuccess(json)
          })
          .catch(error => onError(error))
      } else {
        onError(new FetchError(response, 'Failed to execute GraphQL'))
      }
    })
    .catch(error => onError(error))
}
