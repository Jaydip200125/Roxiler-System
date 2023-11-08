import fetch from require "node-fetch";

async function getPosts() {
    const myPosts = await fetch ("https://s3.amazonaws.com/roxiler.com/product_transaction.json");
    const responce =  await myPosts.json();
    console.log(responce);
    
}
getPosts();