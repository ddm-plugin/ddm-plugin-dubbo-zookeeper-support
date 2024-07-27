<template>
    <div>
        <div>+++{{ count }}</div>
        <button @click="mainPanel.openGithub">open Github</button>
    </div>
</template>

<script>
export default {
    name: "Test",
    props: {
        mainPanel: Object,
    },
    data() {
        return {
            count: 0
        }
    },
    mounted() {
        setInterval(() => {
            this.count++
        }, 1000)
    }
}
</script>

<style>

</style>