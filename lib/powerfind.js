/*
 * $Id$
 *
 * Library to have high performance, low transfers, static search on JavaScript.
 * It does depends on a pre indexed set of files.
 *
 *
 * TODO: Create an additional extension library that uses this in order to provide an easy case using a textfield and templates
 */
var PowerSearch = (function(){
  "use strict";
  // Local variables
  var index_cache = {}; // cache fetched indexed files
  var documents_cache = {}; // cache fetched results files

  // Process the search, optionally can send the language for this query
  function main_search(query, config, page) {
    if (query.length < config.minimum_query) return; // Skip if query is not long enough

    var words = normalize_query(query, config.language, config.customizers);
    query_parts(words, config, page);
  }

  // Normalize the query string
  function normalize_query(query, lang, customizers) {
    // split words by space
    var words = query.split(' ');
    // TODO: Remove possible extra spaces
    // TODO: Clean and transliterate words
    words = words.map(process_lang);
    for (var current in customizers) {
      words = customizers[current](words);
    }
    return words;
  }

  // Review the word and make any linquistic modifications to the word
  function process_lang(word) {
    // TODO: We do linguistic processing here
    return word;
  }

  // Allows external callback functions to be called on the words as pre processors
  function process_custom(words, customizers) {
  }

  function query_parts(words, config, page) {
    var pending_requests = words.length;
    var indexes = [];
    for (var word in words) {
      // Check if the index has being already cached
      if (index_cache.hasOwnProperty(words[word])) {
        pending_requests--; // We substract 1 from the pending requests
        indexes.push(index_cache[words[word]]);
        // If all the requests has being resolved process the results
        if (pending_requests == 0) {
          process_indexes(indexes, config, page);
        }
      } else {
        (function(current_word) { // We use iife to enclose current_word in each iteration
          // If not cached before, request the index
          var url = config.index_base_url + current_word + config.index_ext;
          var request = new XMLHttpRequest();
          request.onreadystatechange = function() {
            if (request.readyState == XMLHttpRequest.DONE) {
              pending_requests--; // We substract 1 from the pending requests
              if (request.status == 200) { // We got search results
                var index_set = request.responseText.split(',');
                var index = [];
                for (var set in index_set) {
                  //index.push(index_set[set].split('|'));
                  var index_pair = index_set[set].split('|');
                  index.push(index_pair[0]);
                }
                index_cache[current_word] = index;
                indexes.push(index);
              } else if (request.status == 404) { // No results for this word
                index_cache[current_word] = [];
                indexes.push([]);
              } else {
                // Some error (should we call listeners to warn?)
                indexes.push([]);
              }

              // If all the requests has being resolved process the results
              if (pending_requests == 0) {
                process_indexes(indexes, config, page);
              }
            }
          };
          request.open('get', url);
          request.send();
        })(words[word]);
      }
    }
  }

  function process_indexes(indexes, config, page) {
    var document_ids = indexes.shift().filter(function(v) {
      return indexes.every(function(a) {
        return a.indexOf(v) !== -1; // TODO: Fix this to use also the weight
      });
    });
    var total = document_ids.length;
    // TODO: calculate paging
    //var on_this_page = total<=config.per_page?total:();
    var documents = [];
    var pending_requests = total<=config.per_page?total:config.per_page;
    for (var d in document_ids) {
      // Calculate which file contains this document information
      var id = document_ids[d]-1;
      var container_number = Math.floor(id/config.documents_per_container);
      var in_container = id%config.documents_per_container;
      // Check if the container has being already cached
      if (documents_cache.hasOwnProperty(container_number)) {
        pending_requests--; // We substract 1 from the pending requests
        documents.push(documents_cache[container_number]['documents'][in_container]);
        // If all the requests has being resolved process the results
        if (pending_requests == 0) {
          process_documents(documents, config); // TODO: send paging info
        }
      } else {
        (function(container, in_container) { // We use iife to enclose current_word in each iteration
          // If not cached before, request the container
          var url = config.index_base_url + config.documents_prefix + (container+1) + config.documents_ext;
          var request = new XMLHttpRequest();
          request.onreadystatechange = function() {
            if (request.readyState == XMLHttpRequest.DONE) {
              pending_requests--; // We substract 1 from the pending requests
              if (request.status == 200) { // We got search results
                var container_content = JSON.parse(request.responseText);
                var doc = container_content['documents'][in_container];
                documents.push(doc);
                documents_cache[container] = container_content;
              } else {
                // Some error (should we call listeners to warn?)
              }

              // If all the requests has being resolved process the results
              if (pending_requests == 0) {
                process_documents(documents, config); // TODO: send paging info
              }
            }
          };
          request.open('get', url);
          request.send();
        })(container_number, in_container);
      }
    }
  }

  function process_documents(documents, config) {
    console.log(documents);
    for (var l in config.listeners) {
      var callback = config.listeners[l];
      callback(documents);
    }
  }

  function Searcher (config) {
    var configuration = {
      "language": 'en', // For when we do languistic preprocessing
      "minimum_query": 2, // Minimum size of the query
      "index_base_url": './search_index/', // Base URL for the requests
      "listeners": [], // An array of registered call functions when results arrive
      "customizers": [], // An array of registered call functions that can preprocess the words of the query, they must return the words
      "index_ext": '.json',
      "documents_ext": '.json',
      "documents_prefix": 'documents',
      "per_page": 10,
      "documents_per_container": 10 // This must match the amout of documents in each list of documents from the indexed data
    };

    if (typeof config != undefined) for (var property in config) {configuration[property] = config[property];}

    this.search = function (query, page) {
      var current_page = 1;
      if (typeof page != undefined) current_page = page;
      main_search(query, configuration, current_page);
    }
  }

  return function(conf) {
    return new Searcher(conf);
  };
}());
