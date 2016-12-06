---
title: "Hello, World"
excerpt: "tinkering with markdown"
header:
    overlay_image: "/assets/images/header.jpg"
categories:
    - Jekyll
gallery:
- url : /assets/images/sample_icpc/icpc_practice.jpg
  image_path: /assets/images/sample_icpc/icpc_practice.jpg
- url: /assets/images/sample_icpc/icpc.jpg
  image_path: /assets/images/sample_icpc/icpc.jpg
- url: /assets/images/sample_icpc/icpc_final.jpg
  image_path: /assets/images/sample_icpc/icpc_final.jpg
  title: "from L-R: aditi, nishit & me"
author_profile: false
---
{% include toc icon="bars" title="Table of Contents"%}
{:toc}

### Hello world

#### Sample Text
This awesome theme has simpler [documentation](https://mmistakes.github.io/minimal-mistakes/docs/quick-start-guide/)
than official [Jekyll docs](https://jekyllrb.com/docs/quickstart/).

:octocat: :book: :zap:

#### Sample Code Snippet
```python
from fractions import gcd
lcm = lambda x,y : x*y/gcd(x,y)
print lcm(18,4) #36
```

#### Sample Image Gallery
{% include gallery caption="My brief adventure @icpc,2015" %}
