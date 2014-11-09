# PowerFind

A high performance and scalable static search in JavaScript

## Why?
We have now great technologies for building static sites like Jekyll for example, but adding features to static sites becames dificult sometimes by the fact that you can't assume to have a server side application.
Features like search have being given great solutions like Lunr, but those solutions are not scalable.
The problem with other static search solutions is that is based on having all the index loaded and processed in the client side before you can search, and this is fine for a few dozens or hundreds of documents, but when you go beyond it becames a problem to send that amount of data to the client and having the browser process so much.

## Proposal
The concept behind power search is to create a pre index for the documents (I will be creating indexers for different technologies), but have this index to be splited in segments, then compress and paginate these segments.
This way we assure that the client will always process a small amount of data, yet proving the possibility to search over any number of documents.

## Current status
This project is currently on planning phase
