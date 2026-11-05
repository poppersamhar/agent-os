import type { WorkerJob } from './workspaceModel';

/** Local preview routing. A model-backed router can replace this without changing task identity. */
export function isTaskContinuation(input: string, task: WorkerJob | undefined): boolean {
  if (!task) return false;
  const text = input.trim();
  if (/^(?:新建|新开|另开|开启|开始)(?:一个|一项|个|项)?(?:新)?任务|^(?:换个话题|另外一个任务|另一个任务|新任务|另一个问题|另外(?:做|生成|制作))/.test(text)) return false;
  if (/^(?:补充|再补充|另外补充|还有一个要求|要求是|希望|不要|改成|改为|换成|继续|把这个|将这个|这个|这份|其中|它的|刚才|上面|下面|最后|加上|加一|删除|去掉|调整|修改|还要|再加|再改)/.test(text)) return true;
  if (/^(?:受众|面向|主题是|风格|配色|内容包括|重点|主要介绍|控制在|长度|页数|标题|封面|每页|用.{0,8}(?:色|风格|语言)|给.{1,15}(?:看|展示|使用)|[一二三四五六七八九十\d]+\s*页)/.test(text)) return true;
  // Topic alone is insufficient: a second independent PPT request is still a new task.
  const topic = /ppt|演示|汇报|幻灯|路演/i.test(task.request) ? /ppt|演示|汇报|幻灯|路演/i
    : /网页|网站|落地页/.test(task.request) ? /网页|网站|落地页/
      : /报告|方案|文档/.test(task.request) ? /报告|方案|文档/ : null;
  return !!topic?.test(text) && /再|修改|调整|补充|改一下|改为|改成|加上|换成/.test(text);
}
