# @barejs/graphql-client

This is a simple GraphQL client which supports queries, mutations and subscriptions.

The default client is compatible with most GraphQL servers using the 
[appolo](https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md)
protocol.
There are two additional
clients which are written specifically to support the
[bareASGI GraphQL](https://bareasgi-graphql-next.readthedocs.io/en/latest/index.html#)
middleware.

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

The `graphqlWsSubscriber` can be used for subscriptions.

```js
import { graphqlWsSubscriber } from '@barejs/graphql-client'

const url = 'http://www.example.com/sse-subscription'
const query = 'subscription { someSubscription { someField someOtherField } }'
const variables = null
const operationName = null

graphqlWsSubscriber(
  url,
  query,
  variables,
  operationName,
  error => console.error(error),
  data => console.log(data))
```

### Queries, Mutations and Subscriptions

The `graphqlClient` can be used for queries, mutations, or subscriptions when using
the 
[bareASGI-graphql-next server](https://github.com/rob-blackbourn/bareasgi-graphql-next)
server. 

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

There are three `graphqlClient` functions:

* `graphqlWsClient`
* `graphqlEventSourceClient`
* `graphqlStreamClient`

They take the same arguments as `graphqlClient` which is an alias for `graphqlWsClient`.

#### graphqlWsClient

The `graphqlWsClient` function uses a WebSocket as the subscription transport.
This implements the
[appolo](https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md)
protocol which is supported by all major GraphQL web servers.

#### graphqlEventSourceClient

The `graphqlEventSourceClient` function uses an `EventSource` as the subscription
transport. It is more efficient than the WebSocket transport, but is only supported
by the 
[bareASGI-graphql-next server](https://github.com/rob-blackbourn/bareasgi-graphql-next)
server. 
The underlying `EventSource` transport requires the subscription query and parameters
to be passed in the url as a query string which can be problematic for large queries.

#### graphqlStreamClient

The `graphqlStreamClient` uses a streaming fetch with `ReadableStreams` as the
subscription transport. This is the most efficient
transport, but is only supported by the
[bareASGI-graphql-next server](https://github.com/rob-blackbourn/bareasgi-graphql-next)
server. The request method is `POST` to large queries are not a problem.

The implementation uses `pipes` which are currently only implemented in the Chrome 
browser, but polyfills are available for most major browsers.

## Installation

```bash
npm install @barejs/graphql-client
```