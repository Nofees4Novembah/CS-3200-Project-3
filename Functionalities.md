# Functionalities


In the following functionalities are chosen to be on the in-memory database in redis:


1. Users browsing the latest available sublease listings:

For this implementation, I will use a sorted set with the key as   `available_listing` and the member being `listing_id`. the score will be the Unix value of `listing_created_at`.

Implementation: 

```
# Initialize
FLUSHALL

#In node, we check if listing_status is open, if so add it to available_listings, with calculated Unix Score

ZADD available_listings [Unix Score] [listing_id]

#get all listings from the latest to oldest created at:

ZREVRANGE available_listings 0 -1

#Find total number of active listings

ZCARD available_listings

#Update a listing that is already in cache - e.g relisted, so new Unix Score

ZADD available_listings XX [Unix Score] [listing_id]

#Remove a listing

ZREM available_listings [listing_id]
```

2. Landlord reviewing pending applications. 

For this implementation I will use a hash set that uses the key  `application_under_review` the field being the `applicant_id` and the value being the entire json object serialized as string `object`

```
#Initialize
FLUSHALL

#Create a HSET that takes in a value

HSET application_under_review [applicant_id] [string object]

#Read all pending applications

HGETALL application_under_review

#Read certain applcation

HGET application_under_review [applicant_id]

#Update a value in the Hash, say the application, the listing_id has been changed (tenant is going for a new listing)

HSET application_under_review [applicant_id] [string object with changed listing_id]

#Remove an application.

HDEL application_under_review [applicant_id]

```