
const { createClient }=require('redis');

const store = createClient();
const subscribe = createClient()
const publish = createClient()
store.connect()
subscribe.connect()
publish.connect()

module.exports={store, subscribe, publish}