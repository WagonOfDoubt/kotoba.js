!function u(f,i,a){function c(r,t){if(!i[r]){if(!f[r]){var e="function"==typeof require&&require;if(!t&&e)return e(r,!0);if(l)return l(r,!0);var o=new Error("Cannot find module '"+r+"'");throw o.code="MODULE_NOT_FOUND",o}var n=i[r]={exports:{}};f[r][0].call(n.exports,function(t){return c(f[r][1][t]||t)},n,n.exports,u,f,i,a)}return i[r].exports}for(var l="function"==typeof require&&require,t=0;t<a.length;t++)c(a[t]);return c}({1:[function(t,r,e){"use strict";function i(t){return(i="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}!function(){var t,r,e,o,n=function(){try{var t=localStorage.getItem("kot_style"),r=JSON.parse(t);if("object"===i(r))return r}catch(t){return{}}return{}}(),u=(t=n,(r=document.documentElement.dataset.board)&&t.boards?t.boards[r]:t.global?t.global:"");if(u){if(!n.styles)return;var f=n.styles[u];if(!f)return;e=f,(o=document.getElementById("user-style")).innerHTML=e.rawCSS,o.dataset.style=e.name}}()},{}]},{},[1]);