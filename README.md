# VK ADS Block

## Install tampermonkey
```
http://tampermonkey.net/
```

```js
   /// OPTIONS
   let DEBUGMODE = false;

   const adMarkers = [
      "реклама",
      "Реклама",
      "Реклам",
      "реклам",
      "promo",
      "advertisement",
      "sponsored",
   ];
   const adLinkPattern = /vk\.cc\/[a-zA-Z0-9]+/g;

   const SELECTORS = [
      "#spa_layout_content div[role='feed']",
      "#page_wrap div[role='feed']",
      "div[role='feed']",
      "#spa_layout_content > div > div > div > div > div > div",
      "#page-wall",
      "#page-wall > div",
   ];
   /// OPTIONS
```

![enter image description here](Assets/chrome_YfVYmzsjJv.png)