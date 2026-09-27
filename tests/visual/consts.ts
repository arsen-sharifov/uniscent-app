import { THEME_VALUES } from '@constants';

import type { IVisualConfig } from './interfaces';

const CANVAS_NODE_SELECTOR = '.react-flow__node';
const RESOLUTION_BAR_SELECTOR = '[class*="--decision-border"]';
const VISUAL_TARGET_SELECTOR = '[data-visual-target]';

export const VISUAL_CONFIG: IVisualConfig = {
  themes: THEME_VALUES.filter((theme) => theme !== 'auto'),
  captures: {
    aside: { mode: 'region', selectors: ['aside'], padding: 24 },
    canvas: { mode: 'region', selectors: [CANVAS_NODE_SELECTOR], padding: 72 },
    canvasNode: {
      mode: 'region',
      selectors: [CANVAS_NODE_SELECTOR],
      padding: 28,
      includeDescendants: true,
    },
    dialog: { mode: 'region', selectors: ['dialog'], padding: 32 },
    fullPage: { mode: 'full-page' },
    fullTarget: { mode: 'element', selector: VISUAL_TARGET_SELECTOR },
    menu: { mode: 'region', selectors: ['[role="menu"]'], padding: 32 },
    popover: {
      mode: 'region',
      selectors: ['[aria-haspopup="dialog"]', 'dialog'],
      padding: 32,
    },
    resolvedCanvas: {
      mode: 'region',
      selectors: [CANVAS_NODE_SELECTOR, RESOLUTION_BAR_SELECTOR],
      padding: 72,
    },
    stepper: { mode: 'region', selectors: ['ol'], padding: 24 },
    target: {
      mode: 'region',
      selectors: [VISUAL_TARGET_SELECTOR],
      padding: 32,
      includeDescendants: true,
    },
    toasts: { mode: 'region', selectors: ['[role="status"]', '[role="alert"]'], padding: 24 },
    viewport: { mode: 'viewport' },
  },
  cases: [
    {
      name: 'colors-palette',
      storyId: 'foundations-colors--palette',
      capture: 'fullPage',
    },
    {
      name: 'typography-atlas',
      storyId: 'foundations-typography--scale',
      capture: 'fullPage',
    },
    {
      name: 'themes-typography',
      storyId: 'foundations-themes--typography',
      capture: 'fullPage',
    },
    {
      name: 'patterns-effects',
      storyId: 'foundations-patterns-effects--effects',
      capture: 'fullPage',
    },
    {
      name: 'themes-atlas',
      storyId: 'foundations-themes--atlas',
      capture: 'fullPage',
    },
    {
      name: 'icons-product-set',
      storyId: 'foundations-icons--product-set',
      capture: 'fullTarget',
    },
    {
      name: 'icons-size-benchmark',
      storyId: 'foundations-icons--size-benchmark',
      capture: 'target',
    },
    {
      name: 'logo-themes',
      storyId: 'branding-logo--themes',
      capture: 'target',
    },
    {
      name: 'canvas-with-nodes',
      storyId: 'components-canvas--with-nodes',
      capture: 'canvas',
    },
    {
      name: 'canvas-evaluated-paths',
      storyId: 'components-canvas--evaluated-paths',
      capture: 'canvas',
    },
    {
      name: 'canvas-node-default',
      storyId: 'components-canvas-canvasnode--default',
      capture: 'canvasNode',
    },
    {
      name: 'toolbar-default',
      storyId: 'components-toolbar--default',
      capture: 'aside',
    },
    {
      name: 'sidebar-default',
      storyId: 'components-sidebar--default',
      capture: 'aside',
    },
    {
      name: 'canvas-resolved-discussion',
      storyId: 'components-canvas--resolved-discussion',
      capture: 'resolvedCanvas',
    },
    {
      name: 'canvas-dense',
      storyId: 'components-canvas--dense',
      capture: 'canvas',
    },
    {
      name: 'canvas-node-selected',
      storyId: 'components-canvas-canvasnode--selected',
      capture: 'canvasNode',
    },
    {
      name: 'canvas-node-invalid',
      storyId: 'components-canvas-canvasnode--invalid',
      capture: 'canvasNode',
    },
    {
      name: 'canvas-node-with-comments',
      storyId: 'components-canvas-canvasnode--with-comments',
      capture: 'canvasNode',
    },
    {
      name: 'canvas-node-answer',
      storyId: 'components-canvas-canvasnode--answer',
      capture: 'canvasNode',
    },
    {
      name: 'question-node-default',
      storyId: 'components-canvas-questionnode--default',
      capture: 'canvasNode',
    },
    {
      name: 'reference-node-default',
      storyId: 'components-canvas-referencenode--default',
      capture: 'canvasNode',
    },
    {
      name: 'context-menu-node',
      storyId: 'components-canvas-contextmenu--node-menu',
      capture: 'menu',
    },
    {
      name: 'reference-search-panel',
      storyId: 'components-canvas-referencesearchpanel--default',
      capture: 'dialog',
    },
    {
      name: 'resolution-bar-resolved',
      storyId: 'components-canvas-resolutionbar--resolved',
      capture: 'target',
    },
    {
      name: 'modal-default',
      storyId: 'components-modal--default',
      capture: 'viewport',
      urlArgs: 'open:true',
    },
    {
      name: 'modal-form',
      storyId: 'components-modal--form-case',
      capture: 'viewport',
      urlArgs: 'open:true',
    },
    {
      name: 'popover-open',
      storyId: 'components-popover--opened-by-default',
      capture: 'popover',
    },
    {
      name: 'list-expanded',
      storyId: 'components-list--expanded',
      capture: 'target',
    },
    {
      name: 'stepper-three-steps',
      storyId: 'components-stepper--three-steps',
      capture: 'stepper',
    },
    {
      name: 'avatar-in-context',
      storyId: 'components-avatar--in-context',
      capture: 'fullTarget',
    },
    {
      name: 'avatar-icons',
      storyId: 'components-avatar--with-icon',
      capture: 'fullTarget',
    },
    {
      name: 'badge-gallery',
      storyId: 'components-badge--gallery',
      capture: 'target',
    },
    {
      name: 'nodi-poses',
      storyId: 'components-mascot--nodi-poses',
      capture: 'target',
    },
    {
      name: 'nodi-beside-the-window',
      storyId: 'components-mascot--nodi-beside-the-window',
      capture: 'viewport',
    },
    {
      name: 'ergo-poses',
      storyId: 'components-mascot--ergo-poses',
      capture: 'target',
    },
    {
      name: 'ergo-beside-the-window',
      storyId: 'components-mascot--ergo-beside-the-window',
      capture: 'viewport',
    },
    {
      name: 'tour-offer',
      storyId: 'components-tour--offer',
      capture: 'viewport',
    },
    {
      name: 'tour-guides-first-visit',
      storyId: 'components-tour--guides-first-visit',
      capture: 'viewport',
    },
    {
      name: 'tour-guides-in-progress',
      storyId: 'components-tour--guides-in-progress',
      capture: 'viewport',
    },
    {
      name: 'tour-celebration',
      storyId: 'components-tour--celebration',
      capture: 'viewport',
    },
    {
      name: 'sidebar-deep-nesting',
      storyId: 'components-sidebar--deep-nesting',
      capture: 'aside',
    },
    {
      name: 'toolbar-disabled-tools',
      storyId: 'components-toolbar--with-disabled-tools',
      capture: 'aside',
    },
    {
      name: 'toolbar-export-menu',
      storyId: 'components-toolbar--export-menu',
      capture: 'target',
    },
    {
      name: 'toast-open-states',
      storyId: 'components-toast--open-states',
      capture: 'toasts',
    },
    {
      name: 'error-boundary-fallback',
      storyId: 'components-errorboundary--fallback',
      capture: 'target',
    },
    {
      name: 'canvas-empty',
      storyId: 'components-canvas--empty',
      capture: 'viewport',
    },
    {
      name: 'canvas-node-editing',
      storyId: 'components-canvas-canvasnode--editing',
      capture: 'canvasNode',
    },
    {
      name: 'canvas-node-long-label',
      storyId: 'components-canvas-canvasnode--long-label',
      capture: 'canvasNode',
    },
    {
      name: 'canvas-node-pending-connection',
      storyId: 'components-canvas-canvasnode--pending-connection',
      capture: 'canvasNode',
    },
    {
      name: 'canvas-node-valid',
      storyId: 'components-canvas-canvasnode--valid',
      capture: 'canvasNode',
    },
    {
      name: 'question-node-placeholder',
      storyId: 'components-canvas-questionnode--placeholder',
      capture: 'canvasNode',
    },
    {
      name: 'question-node-editing',
      storyId: 'components-canvas-questionnode--editing',
      capture: 'canvasNode',
    },
    {
      name: 'context-menu-pane',
      storyId: 'components-canvas-contextmenu--pane-menu',
      capture: 'menu',
    },
    {
      name: 'context-menu-edge',
      storyId: 'components-canvas-contextmenu--edge-menu',
      capture: 'menu',
    },
    {
      name: 'context-menu-reference',
      storyId: 'components-canvas-contextmenu--reference-node-menu',
      capture: 'menu',
    },
    {
      name: 'sidebar-empty',
      storyId: 'components-sidebar--empty',
      capture: 'aside',
    },
    {
      name: 'sidebar-editing-item',
      storyId: 'components-sidebar--editing-item',
      capture: 'aside',
    },
    {
      name: 'sidebar-overflow',
      storyId: 'components-sidebar--overflow',
      capture: 'aside',
    },
    {
      name: 'toolbar-read-only',
      storyId: 'components-toolbar--read-only',
      capture: 'aside',
    },
    {
      name: 'modal-confirm-dialog',
      storyId: 'components-modal--confirm-dialog-case',
      capture: 'viewport',
      urlArgs: 'open:true',
    },
    {
      name: 'modal-with-tabs',
      storyId: 'components-modal--with-tabs',
      capture: 'viewport',
      urlArgs: 'open:true',
    },
    {
      name: 'reference-search-empty',
      storyId: 'components-canvas-referencesearchpanel--empty',
      capture: 'dialog',
    },
  ],
};
