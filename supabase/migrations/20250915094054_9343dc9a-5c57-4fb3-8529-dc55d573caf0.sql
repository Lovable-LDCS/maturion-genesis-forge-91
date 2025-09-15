-- Test the requeue function for the stuck De Beers document
SELECT functions.invoke('requeue-pending-document', 
  json_build_object('documentId', 'a9338846-827e-4d76-850d-377ddad5d6e7')::json
) as requeue_result;