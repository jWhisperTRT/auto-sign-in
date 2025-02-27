import axios from 'axios'
import { stringify } from 'qs'

import getFormattedString from '../utils/date'
import { success, info, warn } from '../utils/output'
import { responsParser } from '../utils/parser'
import checker from '../utils/checker'

import LocationModel from '../model/location.model'
import UserinfoModel from '../model/userinfo.model'

type Params = {
  id: string
  id2: string
}

type RequestParams = {
  isFirstExec: boolean
  userinfo: UserinfoModel
  id: string
  urls: Array<string>
}

// 运行时的日期 作为提交的参数之一
const today = getFormattedString()

// 提交请求的响应结果
const responsMap: Map<string, boolean> = new Map([
  ['登记失败', false],
  ['提交成功', true],
  [today + '登记已存在', true]
])

// 不带地址的一键登记
const signIn = async (url: string, params: Params): Promise<boolean> => {
  info('一键登记中...')
  // 遇到的坑：axios 会自动去掉 params 中值为 undefined 或者空字符串(falsy)的键
  // 而请求时如果不携带 adds 和 addsxy，ISP 会认为没有开启定位，因此这里只能写成 'undefined' 而不能用 undefined
  const { data } = await axios.get(url, { params: { ...params, adds: 'undefined', addsxy: 'undefined' } })
  // 解析页面返回结果
  const msg = responsParser(data)
  const res = responsMap.get(msg!)!
  res ? success(msg!) : warn(msg + '无法完成一键登记，尝试常规登记...')
  return res
}

// 带有地址的常规登记
const signInWithLocation = async (
  url: string,
  location: LocationModel,
  params: Params
): Promise<void> => {
  info('你的地址信息如下：')
  console.log(location)
  info('常规登记中...')
  const { province, city, area } = location
  const { data } = await axios.post(
    url,
    stringify({
      province,
      city,
      area,
      wuhan: '否',
      fare: '否',
      wls: '否',
      kesou: '否',
      zhengduan: '',
      Submit: '提交',
      action: 'add',
      adds: 'undefined',
      addsxy: 'undefined'
    }),
    { params }
  )

  // 解析页面返回结果
  const msg = responsParser(data)
  const res = responsMap.get(msg!)!
  checker(res, msg, new Error('常规登记出错'))
}

const submitRequest = async (requestParams: RequestParams): Promise<void> => {
  const { urls, userinfo, id, isFirstExec } = requestParams
  // 一键登记的地址、常规登记的地址
  const [url, generalUrl] = urls
  const { province, city, area } = userinfo
  const location = { province, city, area } as LocationModel
  // 两种登记方式都需要携带的 params 参数
  const params: Params = { id, id2: today }
  info(`尝试提交${today}的打卡申请...`)
  // 是第一次执行进行常规登记，否则一键登记，一键登记失败则常规登记
  !isFirstExec && await signIn(url, params) || await signInWithLocation(generalUrl, location, params)
}

export default submitRequest
