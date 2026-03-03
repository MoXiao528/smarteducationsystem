import { defineStore } from 'pinia'
import request from '@/utils/request'

export const useDictStore = defineStore('dict', {
    state: () => ({
        semesters: [],
        colleges: [],
        majorsMap: {}, // key: collegeId
        grades: [],
        classesMap: {}, // key: `${gradeId}-${majorId}`
        coursesMap: {}  // key: `${semesterId}-${collegeId}-${majorId}`
    }),
    actions: {
        async getSemesters() {
            if (this.semesters.length === 0) {
                this.semesters = await request({ url: '/dict/semesters', method: 'get' })
            }
            return this.semesters
        },
        async getColleges() {
            if (this.colleges.length === 0) {
                this.colleges = await request({ url: '/dict/colleges', method: 'get' })
            }
            return this.colleges
        },
        async getMajors(collegeId) {
            if (!collegeId) return []
            if (!this.majorsMap[collegeId]) {
                const data = await request({ url: `/dict/majors?collegeId=${collegeId}`, method: 'get' })
                this.majorsMap[collegeId] = data
            }
            return this.majorsMap[collegeId]
        },
        async getGrades() {
            if (this.grades.length === 0) {
                this.grades = await request({ url: '/dict/grades', method: 'get' })
            }
            return this.grades
        },
        async getClasses(gradeId, majorId) {
            if (!gradeId || !majorId) return []
            const key = `${gradeId}-${majorId}`
            if (!this.classesMap[key]) {
                const data = await request({ url: `/dict/classes?gradeId=${gradeId}&majorId=${majorId}`, method: 'get' })
                this.classesMap[key] = data
            }
            return this.classesMap[key]
        },
        async getCourses(semesterId, collegeId, majorId) {
            if (!semesterId) return []
            const key = `${semesterId}-${collegeId || ''}-${majorId || ''}`
            if (!this.coursesMap[key]) {
                const data = await request({
                    url: '/dict/courses',
                    method: 'get',
                    params: { semesterId, collegeId, majorId }
                })
                this.coursesMap[key] = data
            }
            return this.coursesMap[key]
        }
    }
})
