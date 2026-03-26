import { icon } from '../icons.js';
import { h } from '../helpers.js';

export function renderCommunity(state) {
  const posts = state.communityPosts.map(p => {
    const tags = typeof p.tags === 'string' ? JSON.parse(p.tags || '[]') : (p.tags || []);
    return { ...p, tags };
  });

  return `
    <div class="card" style="border:1px solid var(--accent)22;background:var(--abg)">
      <div style="display:flex;gap:10px;align-items:flex-start">
        <div class="avatar-circle" style="width:40px;height:40px;border-radius:10px;font-size:15px;flex-shrink:0;margin-top:2px">
          ${h((state.settings.user_name || 'U')[0])}
        </div>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px">
          <input class="input-field" id="community-title" placeholder="Title (e.g. Today's financial win...)" style="font-weight:600;font-size:13px">
          <textarea class="input-field" id="community-body" placeholder="Share a tip, question, or journal entry..." rows="3" style="resize:vertical;font-size:12px;line-height:1.5"></textarea>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:10px;color:var(--sub)">${icon('book-open', 11, 'var(--sub)')} Your personal finance journal</div>
            <button class="btn btn-primary" style="padding:8px 18px;font-size:12px" data-action="add-community-post">${icon('plus', 12)} Post</button>
          </div>
        </div>
      </div>
    </div>
    ${posts.map(p => `
      <div class="card">
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <div style="width:34px;height:34px;border-radius:8px;background:var(--input);display:flex;align-items:center;justify-content:center;font-size:17px">${p.avatar}</div>
          <div>
            <div style="font-weight:600;font-size:12.5px">${h(p.author)}</div>
            <div style="font-size:10px;color:var(--sub)">${p.time_label || p.time}</div>
          </div>
        </div>
        <div style="font-size:13.5px;font-weight:600;margin-bottom:6px">${h(p.title)}</div>
        <div style="font-size:12px;color:var(--sub);line-height:1.5;margin-bottom:8px">${h(p.body)}</div>
        <div style="display:flex;gap:4px;margin-bottom:10px">
          ${p.tags.map(t => `<span class="tag">#${t}</span>`).join('')}
        </div>
        <div style="display:flex;gap:14px;padding-top:8px;border-top:1px solid var(--border)">
          <button style="display:flex;align-items:center;gap:4px;background:none;border:none;color:var(--accent);font-size:11px">${icon('thumbs-up', 13)} ${p.likes}</button>
          <button style="display:flex;align-items:center;gap:4px;background:none;border:none;color:var(--sub);font-size:11px">${icon('message-circle', 13)} ${p.comments}</button>
          <button style="display:flex;align-items:center;gap:4px;background:none;border:none;color:var(--sub);font-size:11px">${icon('bookmark', 13)} Save</button>
        </div>
      </div>`).join('')}
    ${posts.length === 0 ? '<div class="card empty">No community posts yet. Write your first journal entry above!</div>' : ''}`;
}
