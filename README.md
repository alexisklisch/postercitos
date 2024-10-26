<img width="250" src="https://github.com/user-attachments/assets/307c147b-a307-4c0d-b60a-d95d9b8b7045" />


**Create flyers and posters dynamically!**


## Usage

### Images

**input**
```xml
<svg width="1080" height="1080" viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="img-container" patternUnits="objectBoundingBox" width="1" height="1" viewBox="0 0 500 500">
      <poster-image
        id="image"
        width="500"
        height="500"
        poster:assets="images%"
        preserveAspectRatio="xMidYMid slice"/>
    </pattern>
  </defs>
  <rect width="1080" height="1080" fill="url(#img-container)"/>
</svg>
```

**output**
```xml
<svg width="1080" height="1080" viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="img-container" patternUnits="objectBoundingBox" width="1" height="1" viewBox="0 0 500 500">
      <image
        id="image"
        width="500"
        height="500"
        xlink:href="data:image/jpeg;base64,(BASE64 CODE)"
        preserveAspectRatio="xMidYMid slice"/>
    </pattern>
  </defs>
  <rect width="1080" height="1080" fill="url(#img-container)"/>
</svg>
```

**input**
```xml
<svg width="1058" height="1058" viewBox="0 0 1058 1058" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <clipPath id="circleClip">
      <circle cx="529" cy="529" r="529"/>
    </clipPath>
  </defs>
  <poster-image xlink:href="data:image/jpeg;base64,/9j/4AAQSk...(base64)" width="100%" height="100%" clip-path="url(#circleClip)" preserveAspectRatio="xMidYMid slice"/>
</svg>
```

**output**
```xml
<svg width="1058" height="1058" viewBox="0 0 1058 1058" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <clipPath id="circleClip">
      <circle cx="529" cy="529" r="529"/>
    </clipPath>
  </defs>
  <image xlink:href="data:image/jpeg;base64,/9j/4AAQSk...(base64)" width="100%" height="100%" clip-path="url(#circleClip)" preserveAspectRatio="xMidYMid slice"/>
</svg>
```
