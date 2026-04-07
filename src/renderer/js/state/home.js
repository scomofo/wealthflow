// Home domain: settings, advisor profile, residence, challenges
let state, api;
export function initHome(s, a) { state = s; api = a; }

// Settings
export async function updateSettings(data) {
  state.settings = await api.updateSettings(data);
  return state.settings;
}

// Principal Residence — lazy loaded
export async function loadResidence() {
  state.residence = await api.getPrincipalResidence();
  return state.residence;
}

export async function updateResidence(data) {
  state.residence = await api.updatePrincipalResidence(data);
  return state.residence;
}

// Advisor Profile — lazy loaded
export async function loadAdvisorProfile() {
  state.advisorProfile = await api.getAdvisorProfile();
  return state.advisorProfile;
}

export async function updateAdvisorPersonal(data) {
  const result = await api.updateAdvisorPersonal(data);
  if (state.advisorProfile) state.advisorProfile.personal = result;
  return result;
}
export async function updateAdvisorEmployment(data) {
  const result = await api.updateAdvisorEmployment(data);
  if (state.advisorProfile) state.advisorProfile.employment = result;
  return result;
}
export async function updateAdvisorRisk(data) {
  const result = await api.updateAdvisorRisk(data);
  if (state.advisorProfile) state.advisorProfile.risk = result;
  return result;
}
export async function updateAdvisorRegistered(data) {
  const result = await api.updateAdvisorRegistered(data);
  if (state.advisorProfile) state.advisorProfile.registered = result;
  return result;
}
export async function updateAdvisorInsurance(data) {
  const result = await api.updateAdvisorInsurance(data);
  if (state.advisorProfile) state.advisorProfile.insurance = result;
  return result;
}

export async function upsertAdvisorGoal(g) {
  await api.upsertAdvisorGoal(g);
  if (state.advisorProfile) state.advisorProfile.goals = await api.getAdvisorGoals();
  return g;
}
export async function deleteAdvisorGoal(id) {
  await api.deleteAdvisorGoal(id);
  if (state.advisorProfile) state.advisorProfile.goals = state.advisorProfile.goals.filter(g => g.id !== id);
}

export async function addAdvisorAsset(a) {
  await api.addAdvisorAsset(a);
  if (state.advisorProfile) state.advisorProfile.assets.push(a);
  return a;
}
export async function updateAdvisorAsset(a) {
  await api.updateAdvisorAsset(a);
  if (state.advisorProfile) {
    const idx = state.advisorProfile.assets.findIndex(x => x.id === a.id);
    if (idx >= 0) state.advisorProfile.assets[idx] = a;
  }
  return a;
}
export async function deleteAdvisorAsset(id) {
  await api.deleteAdvisorAsset(id);
  if (state.advisorProfile) state.advisorProfile.assets = state.advisorProfile.assets.filter(a => a.id !== id);
}

export async function addAdvisorDocument(doc) {
  await api.addAdvisorDocument(doc);
  if (state.advisorProfile) state.advisorProfile.documents.unshift(doc);
  return doc;
}
export async function deleteAdvisorDocument(id) {
  const doc = state.advisorProfile?.documents.find(d => d.id === id);
  if (doc) await api.deleteDocumentFile(doc.filename);
  await api.deleteAdvisorDocument(id);
  if (state.advisorProfile) state.advisorProfile.documents = state.advisorProfile.documents.filter(d => d.id !== id);
}

export async function copyDocumentFile(src, dest) { return api.copyDocumentFile(src, dest); }
export async function openDocumentFile(filename) { return api.openDocumentFile(filename); }

// Challenges
export async function updateChallenge(c) {
  await api.updateChallenge(c);
  const idx = state.challenges.findIndex(x => x.id === c.id);
  if (idx >= 0) Object.assign(state.challenges[idx], c);
}
