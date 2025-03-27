<template>
  <router-view/>
</template>

<script>
export default {
  methods: {
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  },
}
</script>