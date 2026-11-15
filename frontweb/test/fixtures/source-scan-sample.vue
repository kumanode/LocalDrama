<!-- fixture for source-scan.test.js: lines 3 and 6 must be reported -->
<template>
  <span>真实中文</span>
  <!-- 内联注释不能算泄漏 -->
  <span>{{ done }}</span>
  <span title="悬停提示">x</span>
</template>
