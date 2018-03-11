## FAQ

This page is yet to be edited by site administrator.

**[Edit this page](/manage/sitesettings#faq)**

Write here about core concepts, posts markup and other stuff.

## Posts markup

Kotoba supports markup language that resembles both Wakaba-mark and Markdown.

### Reflinks

Replies and threads can be referenced by their number:

<a class="reflink">&gt;&gt;180000</a>

Or by board and number:

<a class="reflink">&gt;&gt;/b/180000</a>

Reflinks on separate lines will add post as *reply* to referenced post. If reflink on line with other text, post will be added as *reference*.

You can also just write short link to board like this: <a href="/d" class="reflink">&gt;&gt;&gt;/d/</a>

### Inline tags

<table class="table">
  <thead>
    <tr>
      <th>Input</th>
      <th>Output</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>*italic*</td>
      <td>
        <em>italic</em>
      </td>
    </tr>
    <tr>
      <td>**bold** or __bold__</td>
      <td>
        <strong>bold</strong>
      </td>
    </tr>
    <tr>
      <td>~~strike through~~</td>
      <td>
        <del>strike through</del>
      </td>
    </tr>
    <tr>
      <td>%%spoiler%%</td>
      <td>
        <span class="spoiler">spoiler</span>
      </td>
    </tr>
    <tr>
      <td>!cow text</td>
      <td>
        <strong class="cow">cow text</strong>
      </td>
    </tr>
    <tr>
      <td>&#96;inline code&#96;</td>
      <td>
        <code>inline code</code>
      </td>
    </tr>
    <tr>
      <td>&gt; quote</td>
      <td>
        <q class="unkfunc quote">&gt; quote</q>
      </td>
    </tr>
  </tbody>
</table>

Almost every tag supports nesting, for example:
~~~
this is %%**bold** and *italic*%% text in spoiler
~~~

becomes

this is <span class="spoiler"><strong>bold</strong> and <em>italic</em></span> text in spoiler

If you want both <strong><em>bold and italic</em></strong>, use double underscores for bold:
~~~
__*bold and italic*__ *__other way works too__*
~~~

Single underscores tag for italic is excluded because it would brake many valid URLs.

Nested tags in <code>&#96;code&#96;</code> are not interpreted.

All inline tags break on new line:

~~~
*this
don't work*
~~~

### Block tags

#### Code

Multiline code sould be enclosed in <span><code>&#96;&#96;&#96;</code></span>:

~~~
```
def factorial(n):
    if n == 0:
        return 1
    else:
        return n * factorial(n-1)
```
~~~

becomes

<div>
<code class="code code-multiline">
def factorial(n):
    if n == 0:
        return 1
    else:
        return n * factorial(n-1)
</code>
</div>

Both open and close <span><code>&#96;&#96;&#96;</code></span> tags must be on separate lines.

#### Shift_JIS

You can convert multiline code into Shift_JIS art by adding `aa` after open tag like this:

~~~
```aa
Shift_JIS art here
```
~~~

Result will be with Mona font:

<div>
<code class="code code-aa">
　　　　　　　＿人人人人人人人人人人人人人＿　 _ ,,....,, _
　　　　　　　＞　　ゆっくりしていってね！！！　＜ ::::::::::::::::: " ' :; ,,,
　　　　　　　￣^Ｙ^Ｙ^Ｙ^Ｙ^Ｙ^Ｙ^Ｙ^Ｙ^Ｙ^Ｙ^Ｙ^Ｙ^￣　::::::::::::::::::::::::/"
　　　＿_＿　　　 _____　 ______.　　　　　r‐- .,_／::::::::::::; ／￣ヽ;:::::::|
　　 ネ　　_,, '-´￣￣｀-ゝ、_''　　　　__.)　　　`''ｧ-ｧ'"´, '　　　 ヽ:::|
　　, ﾝ 'r ´　　　　　　　　　　ヽ、　　ゝ_, '"ソ二ﾊ二`ゝ- ﾍ ､_　_ ゞ!._
　 i　,' ＝=─-　　　 　 -─=＝ ;　､'"ヽ, '´　,' 　; 　　`"''‐-=ﾌﾞ､_,:::::"'''- ,,
　 |　i　ｲ ルゝ､ｲ;人レ／ﾙヽｲ　 i　ヽ_/i.　 /!　ﾊ 　ﾊ　 ! ヽ　ヽ 丶'ァ' '"
　 ||. i、|. |　(ﾋ_]　　　　ﾋ_ﾝ) i ﾘｲj　　 <、 ',. /__,.!/ V　､!__,ﾊ､ |｀、｀; ,!i;
　 |　iヽ「 ! ""　　,＿__,　 "" !Y.!　　　ヽ iV (ﾋ_] 　　　ﾋ_ﾝ )　ﾚ !;　 ｲ ）
　 .| |ヽ.L.」　　　 ヽ _ﾝ　　　,'._.」　　　　V i '"　 ,＿__,　　 "' '!　ヽ　 （
　 ヽ |ｲ|| |ヽ､　　　　　　　 ｲ|| |　　　　 i,.人.　　ヽ _ｿ　　　 ,.ﾊ　 ）　､ `､
　 　ﾚ　ﾚル.　｀.ー--一 ´ル レ　　　　ﾉハ　> ,､ ._____,. ,,. ｲ;（　 （ '` .)　）
</code>
</div>

Parser is highly customisable, you can easily add new tags or change default.
Read [wiki](https://github.com/WagonOfDoubt/kotoba.js/wiki/Markup-language-customization) to find out how.


### URLs

If you post a url starting with either http:// or https://, it will automatically be linked.

Parser will automatically decode %20 encoded URL, so [https://zh.wikipedia.org/wiki/%E8%97%AA%E8%B2%93](https://zh.wikipedia.org/wiki/%E8%97%AA%E8%B2%93) becomes [https://zh.wikipedia.org/wiki/藪貓](https://zh.wikipedia.org/wiki/%E8%97%AA%E8%B2%93).

Leave double spaces after url to separate link from punctuation.
"http://example.com&nbsp;&nbsp;, some text" will become "[http://example.com](http://example.com), some text".

Attribute `rel="noreferrer"` is added to links in posts.
