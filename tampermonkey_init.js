// ==UserScript==
// @name         VK ADS Block
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Monitor VK feed, parse posts and hide ads
// @author       You
// @match        https://vk.ru/feed
// @match        https://vk.com/feed
// @icon         https://www.google.com/s2/favicons?sz=64&domain=vk.ru
// @grant        none
// ==/UserScript==

(function () {
   "use strict";

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

   let postsContainer = null;
   let knownPosts = new Set();
   let hiddenPosts = new Set();

   function DEBUG_LOG(content) {
      if (!DEBUGMODE) return;

      console.log(content);
   }

   function findPostsContainer() {
      for (const selector of SELECTORS) {
         const element = document.querySelector(selector);
         if (element) {
            return element;
         }
      }
      return null;
   }

   function parsePost(postElement) {
      if (!postElement) return null;

      const groupNameElement = postElement.querySelector(
         '[data-testid="post-header-title"]',
      );
      const groupName = groupNameElement
         ? groupNameElement.textContent.trim()
         : "";

      const timeElement = postElement.querySelector(
         '[data-testid="post_date_block_preview"]',
      );
      const publishTime = timeElement ? timeElement.textContent.trim() : "";

      const postLink = timeElement ? timeElement.getAttribute("href") : "";

      const likesElement = postElement.querySelector(
         '[data-testid="post_footer_action_like"] .vkitPostFooterAction__label',
      );
      const likes = likesElement ? likesElement.textContent.trim() : "0";

      const commentsElement = postElement.querySelector(
         '[data-testid="post_footer_action_comment"] .vkitPostFooterAction__label',
      );
      const comments = commentsElement
         ? commentsElement.textContent.trim()
         : "0";

      const sharesElement = postElement.querySelector(
         '[data-testid="post_footer_action_share"] .vkitPostFooterAction__label',
      );
      const shares = sharesElement ? sharesElement.textContent.trim() : "0";

      let description = "";
      let isAd = false;
      let adLinks = [];

      const textElement = postElement.querySelector(
         '[data-testid="showmoretext"]',
      );
      if (textElement) {
         const textClone = textElement.cloneNode(true);
         const afterButton = textClone.querySelector(
            '[data-testid="showmoretext-after"]',
         );
         if (afterButton) afterButton.remove();

         let rawDescription = textClone.textContent.trim();

         const foundLinks = rawDescription.match(adLinkPattern);

         if (foundLinks && foundLinks.length > 0) {
            isAd = true;
            adLinks = foundLinks;
            rawDescription = rawDescription;
         }

         for (const marker of adMarkers) {
            if (rawDescription.includes(marker)) {
               isAd = true;
               break;
            }
         }

         const subtitleElement = postElement.querySelector(
            '[data-testid="post-header-subtitle"]',
         );
         if (
            subtitleElement &&
            subtitleElement.textContent.includes("Реклама")
         ) {
            isAd = true;
         }

         description = rawDescription;
      }

      const images = [];
      const imgElements = postElement.querySelectorAll("img");
      imgElements.forEach((img) => {
         const src = img.getAttribute("src");
         if (src && src.includes("vkuserphoto") && !images.includes(src)) {
            images.push(src);
         }
      });

      const postId = postElement.getAttribute("data-post-id") || "";

      return {
         element: postElement,
         postId: postId,
         groupName: groupName,
         publishTime: publishTime,
         postLink: postLink,
         likes: likes,
         comments: comments,
         shares: shares,
         description: description,
         isAd: isAd,
         adLinks: adLinks,
         images: images,
         imagesCount: images.length,
      };
   }

   function hideAdPost(postElement) {
      postElement.style.display = "none";
      postElement.style.visibility = "hidden";
      postElement.style.height = "0";
      postElement.style.margin = "0";
      postElement.style.padding = "0";
      postElement.style.overflow = "hidden";
      postElement.style.opacity = "0";

      postElement.classList.add("ad-post-hidden");
   }

   function getAllPosts() {
      if (!postsContainer) return [];
      return Array.from(postsContainer.querySelectorAll("article"));
   }

   function getNewPosts() {
      const currentPosts = getAllPosts();
      const newPosts = [];

      for (const post of currentPosts) {
         const postId =
            post.getAttribute("data-post-id") ||
            post.querySelector("[data-post-id]")?.getAttribute("data-post-id");

         if (postId && !knownPosts.has(postId)) {
            knownPosts.add(postId);
            newPosts.push(post);
         }
      }

      return newPosts;
   }

   function handleNewPosts(posts) {
      if (posts.length === 0) return;

      posts.forEach((post, index) => {
         const postData = parsePost(post);

         if (postData) {
            if (postData.isAd) {
               DEBUG_LOG(`🚫 Скрыта реклама от: ${postData.groupName}`);
               hideAdPost(postData.element);
               hiddenPosts.add(postData.postId);
            }

            DEBUG_LOG(postData);
         }
      });
      DEBUG_LOG("\n" + "=".repeat(70));
   }

   function hideExistingAds() {
      const allPosts = getAllPosts();
      allPosts.forEach((post) => {
         const postData = parsePost(post);
         if (postData && postData.isAd && !hiddenPosts.has(postData.postId)) {
            hideAdPost(post);
            hiddenPosts.add(postData.postId);

            DEBUG_LOG(
               `🚫 Скрыта существующая реклама от: ${postData.groupName}`,
            );
         }
      });
   }

   function checkChanges() {
      if (!postsContainer) return;
      const newPosts = getNewPosts();
      if (newPosts.length > 0) {
         handleNewPosts(newPosts);
      }
   }

   function setupObserver() {
      postsContainer = findPostsContainer();

      if (!postsContainer) return false;

      getAllPosts().forEach((post) => {
         const postId = post.getAttribute("data-post-id");
         if (postId) knownPosts.add(postId);
      });

      hideExistingAds();

      const observer = new MutationObserver(() => {
         checkChanges();
      });

      observer.observe(postsContainer, {
         childList: true,
         subtree: true,
      });

      const style = document.createElement("style");
      style.textContent = `
            .ad-post-hidden {
                display: none !important;
                visibility: hidden !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                opacity: 0 !important;
            }
        `;
      document.head.appendChild(style);

      return true;
   }

   let attempts = 0;
   const maxAttempts = 10;

   function trySetup() {
      attempts++;

      if (setupObserver()) {
         return;
      }

      if (attempts < maxAttempts) {
         setTimeout(trySetup, 2000);
      }
   }

   window.toggleAdHiding = function (enable = true) {
      if (enable) {
         hideExistingAds();
      } else {
         const hiddenPosts = document.querySelectorAll(".ad-post-hidden");
         hiddenPosts.forEach((post) => {
            post.style.display = "";
            post.style.visibility = "";
            post.style.height = "";
            post.style.margin = "";
            post.style.padding = "";
            post.style.overflow = "";
            post.style.opacity = "";
            post.classList.remove("ad-post-hidden");
         });
         hiddenPosts.clear();
      }
   };

   window.getFeedPosts = function () {
      if (!postsContainer) return [];
      const posts = getAllPosts();
      return posts.map(parsePost).filter((p) => p);
   };

   window.getLastPosts = function (count = 5) {
      const posts = window.getFeedPosts();
      return posts.slice(-count);
   };

   window.getAdStats = function () {
      return {
         hiddenAdsCount: hiddenPosts.size,
         hiddenPosts: Array.from(hiddenPosts),
      };
   };

   setTimeout(trySetup, 1000);
})();
