export function trapFocus(event,container){
  const buttons=[...container.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex="0"]')].filter(el=>!el.closest('[hidden]'));
  const first=buttons[0],last=buttons.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
}
