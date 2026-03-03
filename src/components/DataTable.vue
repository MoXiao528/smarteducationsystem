<template>
  <div class="data-table">
    <el-table
      v-loading="loading"
      :data="data"
      style="width: 100%"
      stripe
      border
      :empty-text="emptyText"
      @sort-change="handleSortChange"
    >
      <el-table-column
        v-for="col in columns"
        :key="col.prop"
        :prop="col.prop"
        :label="col.label"
        :width="col.width"
        :min-width="col.minWidth"
        :sortable="col.sortable ? 'custom' : false"
      >
        <template #default="scope" v-if="col.slotName">
          <slot :name="col.slotName" :row="scope.row"></slot>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-container" v-if="showPagination && total > 0">
      <el-pagination
        v-model:current-page="internalPage"
        v-model:page-size="internalSize"
        :page-sizes="[10, 20, 50, 100]"
        background
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  columns: {
    type: Array,
    required: true,
    // [{ prop: 'id', label: 'ID', sortable: true, slotName: 'customSlot' }]
  },
  data: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  total: {
    type: Number,
    default: 0
  },
  page: {
    type: Number,
    default: 1
  },
  size: {
    type: Number,
    default: 20
  },
  showPagination: {
    type: Boolean,
    default: true
  },
  emptyText: {
    type: String,
    default: '暂无数据'
  }
})

const emit = defineEmits(['update:page', 'update:size', 'fetch-data', 'sort-change'])

const internalPage = ref(props.page)
const internalSize = ref(props.size)

watch(() => props.page, (newVal) => { internalPage.value = newVal })
watch(() => props.size, (newVal) => { internalSize.value = newVal })

const handleSizeChange = (val) => {
  emit('update:size', val)
  emit('update:page', 1) 
  emit('fetch-data')
}

const handleCurrentChange = (val) => {
  emit('update:page', val)
  emit('fetch-data')
}

const handleSortChange = ({ column, prop, order }) => {
  let sortStr = ''
  if(order === 'ascending') {
     sortStr = `${prop},asc`
  } else if(order === 'descending') {
     sortStr = `${prop},desc`
  }
  emit('sort-change', sortStr)
}
</script>

<style scoped>
.data-table {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-table th.el-table__cell) {
  background-color: #f5f7fa !important;
  color: #606266;
  font-weight: 600;
}
</style>
