---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: sw-file-lib
  text: Stormworks file library
  tagline: TypeScript libraries for working with Stormworks files
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: Reference
      link: /api/

features:
  - icon: 💾
    title: Binary Serialization
    details: Read and write Stormworks' binary file formats.
  - icon: 🧩
    title: Type-Safe XML Schemas
    details: Convert XML to strongly typed objects and back using customizable schemas.
  - icon: 📦
    title: Modular Packages
    details: Import only the packages you need with minimal dependencies.
  - icon: 🌐
    title: Browser & Node.js
    details: Works seamlessly in both modern browsers and Node.js environments.
---

<HomeDemo />
