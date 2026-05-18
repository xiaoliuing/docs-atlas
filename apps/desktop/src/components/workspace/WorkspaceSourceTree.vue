<script setup lang="ts">
import type { WorkspaceSourceNode } from '@docs-atlas/shared-types/workspace'
import WorkspaceSourceNodeView from '@/components/workspace/WorkspaceSourceNode.vue'

defineProps<{
  nodes: WorkspaceSourceNode[]
}>()
</script>

<template>
  <div class="workspace-source-tree">
    <WorkspaceSourceNodeView
      v-for="node in nodes"
      :key="node.id"
      :node="node"
    />
  </div>
</template>

<style scoped>
.workspace-source-tree {
  display: grid;
  gap: 0.7rem;
}
</style>
