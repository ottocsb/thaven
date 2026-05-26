API v1 Documentation
The current version (v1) of our API allows for basic GET requests via URL. Users are able to grant API access to some of their settings via an API key provided via their account settings. This key can be regenerated at anytime by the user.

Accessing Wallpaper information
Wallpaper info can be accessed via URL
https://wallhaven.cc/api/v1/w/<ID here>

NSFW wallpapers are blocked to guests. Users can access them by providing their API key:
https://wallhaven.cc/api/v1/w/<ID>?apikey=<API KEY>

GET https://wallhaven.cc/api/v1/w/94x38z
{
  "data": {
    "id": "94x38z",
    "url": "https://wallhaven.cc/w/94x38z",
    "short_url": "http://whvn.cc/94x38z",
    "uploader": {
      "username": "test-user",
      "group": "User",
      "avatar": {
        "200px": "https://wallhaven.cc/images/user/avatar/200/11_3339efb2a813.png",
        "128px": "https://wallhaven.cc/images/user/avatar/128/11_3339efb2a813.png",
        "32px": "https://wallhaven.cc/images/user/avatar/32/11_3339efb2a813.png",
        "20px": "https://wallhaven.cc/images/user/avatar/20/11_3339efb2a813.png"
      }
    },
    "views": 12,
    "favorites": 0,
    "source": "",
    "purity": "sfw",
    "category": "anime",
    "dimension_x": 6742,
    "dimension_y": 3534,
    "resolution": "6742x3534",
    "ratio": "1.91",
    "file_size": 5070446,
    "file_type": "image/jpeg",
    "created_at": "2018-10-31 01:23:10",
    "colors": [
      "#000000",
      "#abbcda",
      "#424153",
      "#66cccc",
      "#333399"
    ],
    "path": "https://w.wallhaven.cc/full/94/wallhaven-94x38z.jpg",
    "thumbs": {
      "large": "https://th.wallhaven.cc/lg/94/94x38z.jpg",
      "original": "https://th.wallhaven.cc/orig/94/94x38z.jpg",
      "small": "https://th.wallhaven.cc/small/94/94x38z.jpg"
    },
    "tags": [
      {
        "id": 1,
        "name": "anime",
        "alias": "Chinese cartoons",
        "category_id": 1,
        "category": "Anime & Manga",
        "purity": "sfw",
        "created_at": "2015-01-16 02:06:45"
      }
    ]
  }
}
Searching and listings
Our search listing API behaves in much the same way as our current search. All search URL parameters are accepted in our API:

Parameter
Allowed values / Examples
Description
q
tagname - search fuzzily for a tag/keyword
-tagname - exclude a tag/keyword
+tag1 +tag2 - must have tag1 and tag2
+tag1 -tag2 - must have tag1 and NOT tag2
@username - user uploads
id:123 - Exact tag search (can not be combined)
type:{png/jpg} - Search for file type (jpg = jpeg)
like:wallpaper ID - Find wallpapers with similar tags
Search query - Your main way of finding what you're looking for
categories
100/101/
111*
/etc (general/anime/people)
Turn categories on(1) or off(0)
purity
100*
/110/111/etc (sfw/sketchy/nsfw)
Turn purities on(1) or off(0)
NSFW requires a valid API key
sorting
date_added*
, relevance, random, views, favorites, toplist
Method of sorting results
order
desc*
, asc
Sorting order
topRange
1d, 3d, 1w,
1M*
, 3M, 6M, 1y
Sorting MUST be set to 'toplist'
atleast
1920x1080
Minimum resolution allowed
resolutions
1920x1080,1920x1200
List of exact wallpaper resolutions
Single resolution allowed
ratios
16x9,16x10
List of aspect ratios
Single ratio allowed
colors
660000 990000 cc0000 cc3333 ea4c88 993399 663399 333399 0066cc 0099cc 66cccc 77cc33 669900 336600 666600 999900 cccc33 ffff00 ffcc33 ff9900 ff6600 cc6633 996633 663300 000000 999999 cccccc ffffff 424153
Search by color
page
1 -
¹
Pagination
¹ Not actually infinite
seed
[a-zA-Z0-9]{6}
Optional seed for random results
* Default

Search listings are accessed via URL:
https://wallhaven.cc/api/v1/search

If an API key is provided, searches will be preformed with that user's browsing settings and default filters:
https://wallhaven.cc/api/v1/search?apikey=<API KEY>

With no additional parameters the search will display the latest SFW wallpapers. See the parameter list above to access other listings (random/toplist/etc.).

Listings are limited to 24 results per page. Meta information is available with each response for pagination.

When searching for an exact tag (id:##), providing the tag exists, the resolved tag name will be provided in the meta data.

Sorting by 'random' will produce a seed that can be passed between pages to ensure there are no repeats when getting a new page.

GET https://wallhaven.cc/api/v1/search
{
  "data": [
    {
      "id": "94x38z",
      "url": "https://wallhaven.cc/w/94x38z",
      "short_url": "http://whvn.cc/94x38z",
      "views": 6,
      "favorites": 0,
      "source": "",
      "purity": "sfw",
      "category": "anime",
      "dimension_x": 6742,
      "dimension_y": 3534,
      "resolution": "6742x3534",
      "ratio": "1.91",
      "file_size": 5070446,
      "file_type": "image/jpeg",
      "created_at": "2018-10-31 01:23:10",
      "colors": [
        "#000000",
        "#abbcda",
        "#424153",
        "#66cccc",
        "#333399"
      ],
      "path": "https://w.wallhaven.cc/94/wallhaven-94x38z.jpg",
      "thumbs": {
        "large": "https://th.wallhaven.cc/lg/94/94x38z.jpg",
        "original": "https://th.wallhaven.cc/orig/94/94x38z.jpg",
        "small": "https://th.wallhaven.cc/small/94/94x38z.jpg"
      }
    },
    {
      "id": "ze1p56",
      "url": "https://wallhaven.cc/w/ze1p56",
      "short_url": "http://whvn.cc/ze1p56",
      "views": 11,
      "favorites": 0,
      "source": "",
      "purity": "sfw",
      "category": "anime",
      "dimension_x": 3779,
      "dimension_y": 2480,
      "resolution": "3779x2480",
      "ratio": "1.52",
      "file_size": 1011043,
      "file_type": "image/jpeg",
      "created_at": "2018-10-07 17:05:28",
      "colors": [
        "#424153",
        "#e7d8b1",
        "#cc3333",
        "#ffffff",
        "#cccccc"
      ],
      "path": "https://w.wallhaven.cc/ze/wallhaven-ze1p56.jpg",
      "thumbs": {
        "large": "https://th.wallhaven.cc/lg/ze/ze1p56.jpg",
        "original": "https://th.wallhaven.cc/orig/ze/ze1p56.jpg",
        "small": "https://th.wallhaven.cc/small/ze/ze1p56.jpg"
      }
    }, 
✂ --- snip ---
  ],
  "meta": {
    "current_page": 1,
    "last_page": 36,
    "per_page": 24,
    "total": 848
    "query": "test" or null
## --- for exact tag searches ---
    "query": {
      "id": 1,
      "tag": "anime"
    }
    "seed": "abc123" or null
  }
}
Tag info
Tag info can be queried via
https://wallhaven.cc/api/v1/tag/<ID>

GET https://wallhaven.cc/api/v1/tag/1
{
  "data": {
    "id": 1,
    "name": "anime",
    "alias": "Chinese cartoons",
    "category_id": 1,
    "category": "Anime & Manga",
    "purity": "sfw",
    "created_at": "2015-01-16 02:06:45"
  }
}
User Settings
Authenticated users can read their user settings via
https://wallhaven.cc/api/v1/settings?apikey=<API KEY>

GET https://wallhaven.cc/api/v1/settings?apikey=****
{
  "data": {
    "thumb_size": "orig",
    "per_page": "24",
    "purity": [
      "sfw",
      "sketchy",
      "nsfw"
    ],
    "categories": [
      "general",
      "anime",
      "people"
    ],
    "resolutions": [
      "1920x1080",
      "2560x1440"
    ],
    "aspect_ratios": [
      "16x9"
    ],
    "toplist_range": "6M",
    "tag_blacklist": [
      "blacklist tag",
      "another"
    ],
    "user_blacklist": [
      ""
    ]
  }
}
User Collections
An authenticated user collections can be accessed via:
https://wallhaven.cc/api/v1/collections?apikey=<API KEY>
Or another user's collections can be listed via:
https://wallhaven.cc/api/v1/collections/USERNAME
Only collections that are public will be accessible to other users. When authenticated, you are able to view all of your own collections.

Viewing the listing of wallpapers in a collection can be accessed via:
https://wallhaven.cc/api/v1/collections/USERNAME/ID
The result will be a similar listing as the search results above. However only the 'purity' filter will be available.
Authenticated users can access their own private collections by using their API key.

GET https://wallhaven.cc/api/v1/collections?apikey=****
{
  "data": [
    {
      "id": 15,
      "label": "Default",
      "views": 38,
      "public": 1,
      "count": 10
    },
    {
      "id": 17,
      "label": "This is another collection",
      "views": 6,
      "public": 1,
      "count": 7
    },
    {
  }
}
Rate Limiting and Errors
API calls are currently limited to 45 per minute. If you do hit this limit, you will receive a 429 - Too many requests error.
Attempting to access a NSFW wallpaper without an API Key or with an invalid one will result in a 401 - Unauthorized error.
Any other attempts to use an invalid API key will result in a 401 - Unauthorized error.

Authentication
Users can authenticate by including their API key either in a request URL by appending ?apikey=<API KEY>, or by including the X-API-Key: <API KEY> header with the request.

Changes to the API
While we will always aim to make sure changes to the API are communicated before hand, there may be issues that arise that will call for changes to be made without warning. Please keep this in mind as you create apps that take advantage of our API. This API is provided for free and as-is with no warranty.
