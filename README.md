# @barejs/graphql-client

This is a simple GraphQL client written specifically to support the
[bareASGI GraphQL middleware](https://bareasgi-graphql-next.readthedocs.io/en/latest/index.html#).

## Usage

### Queries and mutations

The `graphqlFetchClient` function is a thin wrapper around fetch. It can be
used for queries and mutations.

```js
import { graphqlFetchClient } from '@barejs/graphql-client'

const url = 'http://www.example.com/graphql'
const init {}
const query = 'query { someQuery { someField someOtherField } }'
const variables = null
const operationName = null

graphqlFetchClient(
  url,
  init,
  query,
  variables,
  operationName,
  error => console.error(error),
  data => console.log(data))
```

### Subscriptions

The `graphqlEventSourceClient` can be used for subscriptions.

```js
import { graphqlEventSourceClient } from '@barejs/graphql-client'

const url = 'http://www.example.com/sse-subscription'
const query = 'subscription { someSubscription { someField someOtherField } }'
const variables = null
const operationName = null

graphqlEventSourceClient(
  url,
  query,
  variables,
  operationName,
  error => console.error(error),
  data => console.log(data))
```

### Queries, Mutations and Subscriptions

The `graphqlClient` can be used for queries, mutations, or subscriptions.

```js
import { graphqlClient } from '@barejs/graphql-client'

const url = 'http://www.example.com/graphql'

// This could be a query, mutation or subscription.
const query = 'subscription { someSubscription { someField someOtherField } }'
const variables = null
const operationName = null

const unsubscribe = graphqlClient(
  url,
  query,
  variables,
  operationName,
  data => console.log(data),
  error => console.log(error),
  () => console.log('complete'))

// Later ...
unsubscribe()
```

## Installation

```bash
npm install @barejs/graphql-client
```