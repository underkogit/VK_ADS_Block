# VK ADS Block

## Install tampermonkey
```
http://tampermonkey.net/
```

```js
const adMarkers = [
      "реклама",
      "Реклама",
      "Реклам",
      "реклам",
      "promo",
      "advertisement",
      "sponsored",
   ];
```

REGEX Pattern links
```js
const adLinkPattern = /vk\.cc\/[a-zA-Z0-9]+/g;
```