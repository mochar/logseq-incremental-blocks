// From: logseq-plugin-file-manager
export const updateThemeStyle = () => {
  const barkgroupColor = getComputedStyle(parent?.document?.body).getPropertyValue("background-color");
  document.body.style.setProperty('--ls-primary-background-color', barkgroupColor);
  const textColor = getComputedStyle(parent?.document?.body).getPropertyValue("text-decoration-color");
  document.body.style.setProperty('--ls-primary-text-color', textColor);
  const textSecondColor = getComputedStyle(parent?.document?.body).getPropertyValue("text-emphasis-color");
  document.body.style.setProperty('--ls-secondary-text-color', textSecondColor);
  const boderColor = getComputedStyle(parent?.document?.body).getPropertyValue("border-block-color");
  document.body.style.setProperty('--ls-border-color', boderColor);
}
