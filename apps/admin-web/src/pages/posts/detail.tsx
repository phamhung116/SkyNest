import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Card, Field, Input, Panel, Textarea } from "@paragliding/ui";
import type { PostWritePayload } from "@paragliding/api-client";
import { adminApi } from "@/shared/config/api";
import { routes } from "@/shared/config/routes";
import { AdminLayout } from "@/widgets/layout/admin-layout";

const blankValues: PostWritePayload = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  cover_image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
  published: true
};

const blockTags = new Set(["P", "DIV", "LI", "BLOCKQUOTE", "H1", "H2", "H3", "PRE"]);

type EditorIconName =
  | "undo"
  | "redo"
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "superscript"
  | "subscript"
  | "textColor"
  | "highlight"
  | "heading1"
  | "heading2"
  | "heading3"
  | "paragraph"
  | "quote"
  | "code"
  | "alignLeft"
  | "alignCenter"
  | "alignRight"
  | "justify"
  | "bulletList"
  | "numberList"
  | "outdent"
  | "indent"
  | "link"
  | "unlink"
  | "image"
  | "horizontalRule"
  | "clearFormat";

type ToolbarButtonProps = {
  icon: EditorIconName;
  label: string;
  onClick: () => void;
  active?: boolean;
};

type LinkDraft = {
  url: string;
  text: string;
  newTab: boolean;
};

type ImageDraft = {
  url: string;
  alt: string;
  caption: string;
  link: string;
  newTab: boolean;
};

type EditorDialog = "link" | "image" | null;

const emptyLinkDraft: LinkDraft = { url: "", text: "", newTab: true };
const emptyImageDraft: ImageDraft = { url: "", alt: "", caption: "", link: "", newTab: true };

const iconPaths: Record<EditorIconName, string[]> = {
  undo: ["M9 7H5v4", "M5.5 11A7.5 7.5 0 1 1 8 16.6"],
  redo: ["M15 7h4v4", "M18.5 11A7.5 7.5 0 1 0 16 16.6"],
  bold: ["M8 5h5.5a3.3 3.3 0 0 1 0 6.6H8z", "M8 11.6h6.2a3.7 3.7 0 0 1 0 7.4H8z", "M8 5v14"],
  italic: ["M10 5h8", "M6 19h8", "M14 5 10 19"],
  underline: ["M7 5v6.5a5 5 0 0 0 10 0V5", "M5 20h14"],
  strike: ["M7 8.3c.7-2 2.5-3.3 5.1-3.3 2.4 0 4.2.9 5.2 2.6", "M5 12h14", "M17 15.7c-.8 2.1-2.6 3.3-5.3 3.3-2.5 0-4.5-1-5.7-2.9"],
  superscript: ["m5 16 6-8", "m5 8 6 8", "M15 7.5c0-2 3.5-2 3.5 0 0 1.4-2.5 1.9-3.5 3.5h4"],
  subscript: ["m5 15 6-8", "m5 7 6 8", "M15 15.5c0-2 3.5-2 3.5 0 0 1.4-2.5 1.9-3.5 3.5h4"],
  textColor: ["M7 18 12 5l5 13", "M9 13h6", "M5 21h14"],
  highlight: ["m5 14 9-9 5 5-9 9H5z", "M14 5 19 10", "M4 21h16"],
  heading1: ["M5 6v12", "M13 6v12", "M5 12h8", "M17 10l2-1.5V18"],
  heading2: ["M5 6v12", "M13 6v12", "M5 12h8", "M16.5 10.2a2 2 0 0 1 3.5 1.3c0 2.4-3.8 3.3-3.8 5.5H20"],
  heading3: ["M5 6v12", "M13 6v12", "M5 12h8", "M16.5 10h3l-2 3a2.3 2.3 0 1 1-1.7 3.9"],
  paragraph: ["M16 19V5", "M12 19V5", "M16 5h-5a4 4 0 1 0 0 8h5"],
  quote: ["M9 9H6.5A2.5 2.5 0 0 0 4 11.5V17h5z", "M20 9h-2.5a2.5 2.5 0 0 0-2.5 2.5V17h5z"],
  code: ["m9 8-4 4 4 4", "m15 8 4 4-4 4", "m13 5-2 14"],
  alignLeft: ["M5 6h14", "M5 10h9", "M5 14h14", "M5 18h9"],
  alignCenter: ["M5 6h14", "M8 10h8", "M5 14h14", "M8 18h8"],
  alignRight: ["M5 6h14", "M10 10h9", "M5 14h14", "M10 18h9"],
  justify: ["M5 6h14", "M5 10h14", "M5 14h14", "M5 18h14"],
  bulletList: ["M10 7h9", "M10 12h9", "M10 17h9", "M5 7h.01", "M5 12h.01", "M5 17h.01"],
  numberList: ["M11 7h8", "M11 12h8", "M11 17h8", "M5.5 5.7 7 5v4", "M5 13.2c0-1.7 3-1.7 3 0 0 1.2-2 1.6-3 3h3"],
  outdent: ["M12 7h7", "M12 12h7", "M12 17h7", "m8 9-4 3 4 3"],
  indent: ["M12 7h7", "M12 12h7", "M12 17h7", "m4 9 4 3-4 3"],
  link: ["M9.5 14.5 14.5 9.5", "M8 11.5 6.8 12.7a3.6 3.6 0 0 0 5.1 5.1l2-2", "M16 12.5l1.2-1.2a3.6 3.6 0 0 0-5.1-5.1l-2 2"],
  unlink: ["M9.5 14.5 14.5 9.5", "M8 11.5 6.8 12.7a3.6 3.6 0 0 0 5.1 5.1l1-1", "M16 12.5l1.2-1.2a3.6 3.6 0 0 0-5.1-5.1l-1 1", "M5 5 19 19"],
  image: ["M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", "M7 16l3.3-3.3 2.7 2.7 2-2L18 16", "M15.5 9.5h.01"],
  horizontalRule: ["M5 12h14", "M8 7h8", "M8 17h8"],
  clearFormat: ["M7 6h10", "m14 6-5 12", "M5 19h9", "m16 15 4 4", "m20 15-4 4"]
};

const command = (name: string, value?: string) => {
  return document.execCommand(name, false, value);
};

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(https?:|mailto:|tel:|data:image\/|blob:|#|\/)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const applyAnchorOptions = (anchor: HTMLAnchorElement, href: string, newTab: boolean) => {
  anchor.setAttribute("href", href);
  if (newTab) {
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
  } else {
    anchor.removeAttribute("target");
    anchor.removeAttribute("rel");
  }
};

const EditorIcon = ({ name }: { name: EditorIconName }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {iconPaths[name].map((path) => (
      <path key={path} d={path} />
    ))}
  </svg>
);

const ToolbarButton = ({ icon, label, onClick, active = false }: ToolbarButtonProps) => (
  <button
    type="button"
    className={`word-editor__tool${active ? " is-active" : ""}`}
    onClick={onClick}
    aria-label={label}
    title={label}
  >
    <span className="word-editor__tool-icon">
      <EditorIcon name={icon} />
    </span>
  </button>
);

export const PostDetailPage = () => {
  const { slug = "" } = useParams();
  const isNew = slug === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);
  const activeImageRef = useRef<HTMLImageElement | null>(null);
  const selectedLinkTextRef = useRef("");
  const form = useForm<PostWritePayload>({ defaultValues: blankValues });
  const published = form.watch("published");
  const coverImage = form.watch("cover_image");
  const [activeCommands, setActiveCommands] = useState<Record<string, boolean>>({});
  const [dialog, setDialog] = useState<EditorDialog>(null);
  const [dialogError, setDialogError] = useState("");
  const [linkDraft, setLinkDraft] = useState<LinkDraft>(emptyLinkDraft);
  const [imageDraft, setImageDraft] = useState<ImageDraft>(emptyImageDraft);

  const postQuery = useQuery({
    queryKey: ["admin-post", slug],
    queryFn: () => adminApi.getPost(slug),
    enabled: Boolean(slug) && !isNew
  });

  const saveMutation = useMutation({
    mutationFn: (payload: PostWritePayload) => (isNew ? adminApi.createPost(payload) : adminApi.updatePost(slug, payload)),
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      navigate(`/posts/${post.slug}`, { replace: true });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deletePost(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      navigate(routes.posts, { replace: true });
    }
  });

  const isNodeInsideEditor = (node: Node | null) => {
    const editor = editorRef.current;
    return Boolean(editor && node && editor.contains(node));
  };

  const isRangeInsideEditor = (range: Range | null) => Boolean(range && isNodeInsideEditor(range.commonAncestorContainer));

  const readActiveRange = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }
    const range = selection.getRangeAt(0);
    return isRangeInsideEditor(range) ? range : null;
  };

  const placeCaretAtEnd = () => {
    const editor = editorRef.current;
    if (!editor) {
      return null;
    }
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    selectionRef.current = range.cloneRange();
    return range;
  };

  const saveSelection = () => {
    const range = readActiveRange();
    if (range) {
      selectionRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    if (!editor) {
      return null;
    }
    editor.focus();
    const savedRange = selectionRef.current;
    if (!isRangeInsideEditor(savedRange)) {
      return placeCaretAtEnd();
    }
    const range = savedRange as Range;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return range;
  };

  const setCaretAfter = (node: Node) => {
    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    selectionRef.current = range.cloneRange();
  };

  const setCaretInside = (node: Node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    selectionRef.current = range.cloneRange();
  };

  const getClosestBlock = (node: Node) => {
    const editor = editorRef.current;
    let element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    while (element && editor && element !== editor) {
      if (blockTags.has(element.tagName)) {
        return element as HTMLElement;
      }
      element = element.parentElement;
    }
    return null;
  };

  const syncContent = () => {
    form.setValue("content", editorRef.current?.innerHTML ?? "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true
    });
  };

  const refreshActiveCommands = () => {
    if (!readActiveRange()) {
      setActiveCommands({});
      return;
    }
    const stateFor = (name: string) => {
      try {
        return document.queryCommandState(name);
      } catch {
        return false;
      }
    };
    setActiveCommands({
      bold: stateFor("bold"),
      italic: stateFor("italic"),
      underline: stateFor("underline"),
      strikeThrough: stateFor("strikeThrough"),
      superscript: stateFor("superscript"),
      subscript: stateFor("subscript"),
      insertUnorderedList: stateFor("insertUnorderedList"),
      insertOrderedList: stateFor("insertOrderedList"),
      justifyLeft: stateFor("justifyLeft"),
      justifyCenter: stateFor("justifyCenter"),
      justifyRight: stateFor("justifyRight"),
      justifyFull: stateFor("justifyFull")
    });
  };

  const afterEditorChange = () => {
    syncContent();
    saveSelection();
    refreshActiveCommands();
  };

  const runCommand = (name: string, value?: string) => {
    restoreSelection();
    command("styleWithCSS", "true");
    const applied = command(name, value);
    if (!applied && name === "hiliteColor") {
      command("backColor", value);
    }
    afterEditorChange();
  };

  const runColorCommand = (name: "foreColor" | "hiliteColor", label: string, defaultValue: string) => {
    saveSelection();
    const value = window.prompt(label, defaultValue);
    if (value?.trim()) {
      runCommand(name, value.trim());
    }
  };

  const insertBlockNode = (node: HTMLElement) => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    restoreSelection();
    const range = readActiveRange();
    const spacer = document.createElement("p");
    spacer.appendChild(document.createElement("br"));

    if (!range) {
      editor.appendChild(node);
    } else {
      const wasCollapsed = range.collapsed;
      const anchorBlock = wasCollapsed ? getClosestBlock(range.startContainer) : null;
      if (anchorBlock && anchorBlock.parentElement && anchorBlock !== editor) {
        anchorBlock.after(node);
      } else {
        range.deleteContents();
        range.insertNode(node);
      }
    }

    node.after(spacer);
    setCaretInside(spacer);
    afterEditorChange();
  };

  const closeDialog = () => {
    setDialog(null);
    setDialogError("");
    activeLinkRef.current = null;
    activeImageRef.current = null;
  };

  const findSelectedAnchor = () => {
    const range = readActiveRange() ?? selectionRef.current;
    if (!range) {
      return null;
    }
    let element = range.startContainer.nodeType === Node.ELEMENT_NODE ? (range.startContainer as Element) : range.startContainer.parentElement;
    while (element && editorRef.current && editorRef.current.contains(element)) {
      if (element.tagName === "A") {
        return element as HTMLAnchorElement;
      }
      element = element.parentElement;
    }
    return null;
  };

  const openLinkDialog = () => {
    saveSelection();
    const selectedAnchor = findSelectedAnchor();
    const selectedText = selectedAnchor?.textContent?.trim() || selectionRef.current?.toString().trim() || "";
    activeLinkRef.current = selectedAnchor;
    selectedLinkTextRef.current = selectedText;
    setLinkDraft({
      url: selectedAnchor?.getAttribute("href") ?? "",
      text: selectedText,
      newTab: selectedAnchor ? selectedAnchor.target === "_blank" : true
    });
    setDialogError("");
    setDialog("link");
  };

  const submitLink = () => {
    const href = normalizeUrl(linkDraft.url);
    const text = linkDraft.text.trim();
    const editor = editorRef.current;

    if (!href) {
      setDialogError("Nhap URL lien ket truoc khi ap dung.");
      return;
    }
    if (!editor) {
      return;
    }

    restoreSelection();
    const existingLink = activeLinkRef.current && editor.contains(activeLinkRef.current) ? activeLinkRef.current : null;
    if (existingLink) {
      applyAnchorOptions(existingLink, href, linkDraft.newTab);
      if (text) {
        existingLink.textContent = text;
      }
      setCaretAfter(existingLink);
      syncContent();
      closeDialog();
      return;
    }

    const range = readActiveRange();
    const anchor = document.createElement("a");
    applyAnchorOptions(anchor, href, linkDraft.newTab);

    if (range && !range.collapsed) {
      if (text && text !== selectedLinkTextRef.current) {
        anchor.textContent = text;
        range.deleteContents();
      } else {
        anchor.appendChild(range.extractContents());
      }
      if (!anchor.textContent?.trim() && anchor.childNodes.length === 0) {
        anchor.textContent = text || href;
      }
      range.insertNode(anchor);
    } else {
      anchor.textContent = text || href;
      if (range) {
        range.insertNode(anchor);
      } else {
        editor.appendChild(anchor);
      }
    }

    setCaretAfter(anchor);
    syncContent();
    closeDialog();
  };

  const openImageDialog = () => {
    saveSelection();
    activeImageRef.current = null;
    setImageDraft(emptyImageDraft);
    setDialogError("");
    setDialog("image");
  };

  const openImageEditDialog = (image: HTMLImageElement) => {
    const figure = image.closest("figure.post-image");
    const imageLink = image.parentElement?.tagName === "A" ? (image.parentElement as HTMLAnchorElement) : null;
    activeImageRef.current = image;
    setImageDraft({
      url: image.getAttribute("src") ?? "",
      alt: image.getAttribute("alt") ?? "",
      caption: figure?.querySelector("figcaption")?.textContent?.trim() ?? "",
      link: imageLink?.getAttribute("href") ?? "",
      newTab: imageLink ? imageLink.target === "_blank" : true
    });
    setDialogError("");
    setDialog("image");
  };

  const ensureImageFigure = (image: HTMLImageElement) => {
    const currentFigure = image.closest("figure.post-image");
    if (currentFigure && editorRef.current?.contains(currentFigure)) {
      return currentFigure as HTMLElement;
    }

    const currentLink = image.parentElement?.tagName === "A" ? (image.parentElement as HTMLAnchorElement) : null;
    const wrapper = currentLink ?? image;
    const figure = document.createElement("figure");
    figure.className = "post-image";
    wrapper.replaceWith(figure);
    figure.appendChild(wrapper);
    return figure;
  };

  const applyImageLink = (image: HTMLImageElement, linkValue: string, newTab: boolean) => {
    const href = normalizeUrl(linkValue);
    const currentLink = image.parentElement?.tagName === "A" ? (image.parentElement as HTMLAnchorElement) : null;

    if (!href) {
      if (currentLink) {
        currentLink.replaceWith(image);
      }
      return;
    }

    if (currentLink) {
      applyAnchorOptions(currentLink, href, newTab);
      return;
    }

    const anchor = document.createElement("a");
    applyAnchorOptions(anchor, href, newTab);
    image.replaceWith(anchor);
    anchor.appendChild(image);
  };

  const applyImageCaption = (figure: HTMLElement, caption: string) => {
    figure.querySelectorAll("figcaption").forEach((node) => node.remove());
    const trimmedCaption = caption.trim();
    if (!trimmedCaption) {
      return;
    }
    const figcaption = document.createElement("figcaption");
    figcaption.textContent = trimmedCaption;
    figure.appendChild(figcaption);
  };

  const createImageFigure = () => {
    const image = document.createElement("img");
    image.setAttribute("src", normalizeUrl(imageDraft.url));
    image.setAttribute("alt", imageDraft.alt.trim());
    image.setAttribute("loading", "lazy");
    image.setAttribute("decoding", "async");

    const figure = document.createElement("figure");
    figure.className = "post-image";
    figure.appendChild(image);
    applyImageLink(image, imageDraft.link, imageDraft.newTab);
    applyImageCaption(figure, imageDraft.caption);
    return figure;
  };

  const submitImage = () => {
    const imageUrl = normalizeUrl(imageDraft.url);
    const alt = imageDraft.alt.trim();
    const editor = editorRef.current;

    if (!imageUrl) {
      setDialogError("Nhap URL anh truoc khi chen.");
      return;
    }
    if (!alt) {
      setDialogError("Nhap alt text de anh co mo ta ro rang.");
      return;
    }
    if (!editor) {
      return;
    }

    const existingImage = activeImageRef.current && editor.contains(activeImageRef.current) ? activeImageRef.current : null;
    if (existingImage) {
      existingImage.setAttribute("src", imageUrl);
      existingImage.setAttribute("alt", alt);
      existingImage.setAttribute("loading", "lazy");
      existingImage.setAttribute("decoding", "async");
      const figure = ensureImageFigure(existingImage);
      applyImageLink(existingImage, imageDraft.link, imageDraft.newTab);
      applyImageCaption(figure, imageDraft.caption);
      setCaretAfter(figure);
      syncContent();
      closeDialog();
      return;
    }

    insertBlockNode(createImageFigure());
    closeDialog();
  };

  const handleEditorDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof HTMLImageElement) {
      openImageEditDialog(target);
    }
  };

  const submitDialogOnEnter = (event: KeyboardEvent<HTMLDivElement>, submit: () => void) => {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      submit();
    }
  };

  const handlePostSubmit = (values: PostWritePayload) => {
    const nextContent = editorRef.current?.innerHTML ?? values.content;
    saveMutation.mutate({ ...values, content: nextContent });
  };

  useEffect(() => {
    if (isNew) {
      form.reset(blankValues);
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
      return;
    }
    if (postQuery.data) {
      const nextValues = {
        slug: postQuery.data.slug,
        title: postQuery.data.title,
        excerpt: postQuery.data.excerpt,
        content: postQuery.data.content,
        cover_image: postQuery.data.cover_image,
        published: postQuery.data.published
      };
      form.reset(nextValues);
      if (editorRef.current) {
        editorRef.current.innerHTML = postQuery.data.content;
      }
    }
  }, [form, isNew, postQuery.data]);

  return (
    <AdminLayout>
      <div className="portal-stack">
        <div className="portal-heading">
          <div className="portal-heading__text">
            <Badge>{published ? "PUBLISHED" : "DRAFT"}</Badge>
            <h1>{isNew ? "Tao bai viet" : postQuery.data?.title ?? "Post detail"}</h1>
            <p>Trang chi tiet bai viet chi tap trung vao noi dung va metadata cua bai viet nay.</p>
          </div>
          <Link to={routes.posts}>
            <Button variant="secondary">Quay lai danh sach</Button>
          </Link>
        </div>

        <Card className="post-editor-card">
          <Panel className="admin-stack">
            <form className="post-editor-layout" onSubmit={form.handleSubmit(handlePostSubmit)}>
              <div className="word-editor">
                <div className="word-editor__toolbar" onMouseDown={(event) => event.preventDefault()}>
                  <div className="word-editor__toolbar-group" aria-label="History">
                    <ToolbarButton icon="undo" label="Undo" onClick={() => runCommand("undo")} />
                    <ToolbarButton icon="redo" label="Redo" onClick={() => runCommand("redo")} />
                  </div>
                  <div className="word-editor__toolbar-group" aria-label="Text formatting">
                    <ToolbarButton icon="bold" label="In dam" active={activeCommands.bold} onClick={() => runCommand("bold")} />
                    <ToolbarButton icon="italic" label="In nghieng" active={activeCommands.italic} onClick={() => runCommand("italic")} />
                    <ToolbarButton icon="underline" label="Gach chan" active={activeCommands.underline} onClick={() => runCommand("underline")} />
                    <ToolbarButton icon="strike" label="Gach ngang" active={activeCommands.strikeThrough} onClick={() => runCommand("strikeThrough")} />
                    <ToolbarButton icon="superscript" label="Chi so tren" active={activeCommands.superscript} onClick={() => runCommand("superscript")} />
                    <ToolbarButton icon="subscript" label="Chi so duoi" active={activeCommands.subscript} onClick={() => runCommand("subscript")} />
                  </div>
                  <div className="word-editor__toolbar-group" aria-label="Color">
                    <ToolbarButton icon="textColor" label="Mau chu" onClick={() => runColorCommand("foreColor", "Nhap ma mau chu", "#7e112b")} />
                    <ToolbarButton icon="highlight" label="Mau nen chu" onClick={() => runColorCommand("hiliteColor", "Nhap ma mau nen", "#fff2a8")} />
                  </div>
                  <div className="word-editor__toolbar-group" aria-label="Block formatting">
                    <ToolbarButton icon="paragraph" label="Paragraph" onClick={() => runCommand("formatBlock", "P")} />
                    <ToolbarButton icon="heading1" label="Heading 1" onClick={() => runCommand("formatBlock", "H1")} />
                    <ToolbarButton icon="heading2" label="Heading 2" onClick={() => runCommand("formatBlock", "H2")} />
                    <ToolbarButton icon="heading3" label="Heading 3" onClick={() => runCommand("formatBlock", "H3")} />
                    <ToolbarButton icon="quote" label="Quote" onClick={() => runCommand("formatBlock", "BLOCKQUOTE")} />
                    <ToolbarButton icon="code" label="Code block" onClick={() => runCommand("formatBlock", "PRE")} />
                  </div>
                  <div className="word-editor__toolbar-group" aria-label="Text alignment">
                    <ToolbarButton icon="alignLeft" label="Can trai" active={activeCommands.justifyLeft} onClick={() => runCommand("justifyLeft")} />
                    <ToolbarButton icon="alignCenter" label="Can giua" active={activeCommands.justifyCenter} onClick={() => runCommand("justifyCenter")} />
                    <ToolbarButton icon="alignRight" label="Can phai" active={activeCommands.justifyRight} onClick={() => runCommand("justifyRight")} />
                    <ToolbarButton icon="justify" label="Can deu" active={activeCommands.justifyFull} onClick={() => runCommand("justifyFull")} />
                  </div>
                  <div className="word-editor__toolbar-group" aria-label="Lists">
                    <ToolbarButton
                      icon="bulletList"
                      label="Danh sach cham"
                      active={activeCommands.insertUnorderedList}
                      onClick={() => runCommand("insertUnorderedList")}
                    />
                    <ToolbarButton
                      icon="numberList"
                      label="Danh sach so"
                      active={activeCommands.insertOrderedList}
                      onClick={() => runCommand("insertOrderedList")}
                    />
                    <ToolbarButton icon="outdent" label="Giam thut le" onClick={() => runCommand("outdent")} />
                    <ToolbarButton icon="indent" label="Tang thut le" onClick={() => runCommand("indent")} />
                  </div>
                  <div className="word-editor__toolbar-group" aria-label="Insert">
                    <ToolbarButton icon="link" label="Chen link" onClick={openLinkDialog} />
                    <ToolbarButton icon="unlink" label="Bo link" onClick={() => runCommand("unlink")} />
                    <ToolbarButton icon="image" label="Chen anh" onClick={openImageDialog} />
                    <ToolbarButton
                      icon="horizontalRule"
                      label="Chen duong ke"
                      onClick={() => {
                        const horizontalRule = document.createElement("hr");
                        insertBlockNode(horizontalRule);
                      }}
                    />
                  </div>
                  <div className="word-editor__toolbar-group" aria-label="Cleanup">
                    <ToolbarButton icon="clearFormat" label="Xoa format" onClick={() => runCommand("removeFormat")} />
                  </div>
                </div>

                {dialog === "link" ? (
                  <div className="word-editor-dialog" role="dialog" aria-label="Chen lien ket" onKeyDown={(event) => submitDialogOnEnter(event, submitLink)}>
                    <div className="word-editor-dialog__header">
                      <strong>{activeLinkRef.current ? "Sua lien ket" : "Chen lien ket"}</strong>
                      <button type="button" onClick={closeDialog} aria-label="Dong">
                        x
                      </button>
                    </div>
                    <div className="word-editor-dialog__grid">
                      <Field label="URL lien ket">
                        <Input value={linkDraft.url} onChange={(event) => setLinkDraft((draft) => ({ ...draft, url: event.target.value }))} autoFocus />
                      </Field>
                      <Field label="Text hien thi">
                        <Input value={linkDraft.text} onChange={(event) => setLinkDraft((draft) => ({ ...draft, text: event.target.value }))} />
                      </Field>
                    </div>
                    <label className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={linkDraft.newTab}
                        onChange={(event) => setLinkDraft((draft) => ({ ...draft, newTab: event.target.checked }))}
                      />
                      <span>Mo link trong tab moi</span>
                    </label>
                    {dialogError ? <p className="form-error">{dialogError}</p> : null}
                    <div className="word-editor-dialog__actions">
                      <Button type="button" onClick={submitLink}>
                        Ap dung link
                      </Button>
                      <Button type="button" variant="secondary" onClick={closeDialog}>
                        Huy
                      </Button>
                    </div>
                  </div>
                ) : null}

                {dialog === "image" ? (
                  <div className="word-editor-dialog" role="dialog" aria-label="Chen anh" onKeyDown={(event) => submitDialogOnEnter(event, submitImage)}>
                    <div className="word-editor-dialog__header">
                      <strong>{activeImageRef.current ? "Sua anh" : "Chen anh"}</strong>
                      <button type="button" onClick={closeDialog} aria-label="Dong">
                        x
                      </button>
                    </div>
                    <div className="word-editor-dialog__grid">
                      <Field label="URL anh">
                        <Input value={imageDraft.url} onChange={(event) => setImageDraft((draft) => ({ ...draft, url: event.target.value }))} autoFocus />
                      </Field>
                      <Field label="Alt text">
                        <Input value={imageDraft.alt} onChange={(event) => setImageDraft((draft) => ({ ...draft, alt: event.target.value }))} />
                      </Field>
                      <Field label="Caption">
                        <Input value={imageDraft.caption} onChange={(event) => setImageDraft((draft) => ({ ...draft, caption: event.target.value }))} />
                      </Field>
                      <Field label="Link cho anh">
                        <Input value={imageDraft.link} onChange={(event) => setImageDraft((draft) => ({ ...draft, link: event.target.value }))} />
                      </Field>
                    </div>
                    <label className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={imageDraft.newTab}
                        onChange={(event) => setImageDraft((draft) => ({ ...draft, newTab: event.target.checked }))}
                      />
                      <span>Mo link anh trong tab moi</span>
                    </label>
                    <small>Double-click vao anh trong noi dung de sua URL, alt text, caption hoac link.</small>
                    {dialogError ? <p className="form-error">{dialogError}</p> : null}
                    <div className="word-editor-dialog__actions">
                      <Button type="button" onClick={submitImage}>
                        {activeImageRef.current ? "Cap nhat anh" : "Chen anh"}
                      </Button>
                      <Button type="button" variant="secondary" onClick={closeDialog}>
                        Huy
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div
                  ref={editorRef}
                  className="word-editor__surface"
                  contentEditable
                  onInput={afterEditorChange}
                  onBlur={saveSelection}
                  onFocus={saveSelection}
                  onKeyUp={afterEditorChange}
                  onMouseUp={afterEditorChange}
                  onDoubleClick={handleEditorDoubleClick}
                  role="textbox"
                  aria-label="Noi dung bai viet"
                  suppressContentEditableWarning
                />
              </div>

              <aside className="post-editor-sidebar">
                <div className="post-publish-card">
                  <Badge>{published ? "Da san sang" : "Ban nhap"}</Badge>
                  <strong>{isNew ? "Bai viet moi" : "Xuat ban"}</strong>
                  <p>Kiem tra noi dung lan cuoi truoc khi luu thay doi.</p>
                </div>
                <Field label="Tieu de">
                  <Input {...form.register("title")} />
                </Field>
                <Field label="Slug">
                  <Input {...form.register("slug")} disabled={!isNew} />
                </Field>
                <Field label="Tom tat ngan">
                  <Textarea {...form.register("excerpt")} />
                </Field>
                <Field label="Thumbnail URL">
                  <Input {...form.register("cover_image")} />
                </Field>
                {coverImage ? <img className="post-editor-sidebar__thumb" src={coverImage} alt="Post thumbnail preview" /> : null}
                <label className="admin-checkbox">
                  <input type="checkbox" {...form.register("published")} />
                  <span>{published ? "Dang published" : "Luu draft"}</span>
                </label>
                <input type="hidden" {...form.register("content")} />
                {saveMutation.error instanceof Error ? <p className="form-error">{saveMutation.error.message}</p> : null}
                {deleteMutation.error instanceof Error ? <p className="form-error">{deleteMutation.error.message}</p> : null}
                <div className="post-editor-sidebar__actions">
                  <Button disabled={saveMutation.isPending}>{saveMutation.isPending ? "Dang luu..." : "Luu bai viet"}</Button>
                  {!isNew ? (
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => {
                        if (window.confirm("Xoa bai viet nay?")) {
                          deleteMutation.mutate();
                        }
                      }}
                    >
                      Xoa bai viet
                    </Button>
                  ) : null}
                </div>
              </aside>
            </form>
          </Panel>
        </Card>
      </div>
    </AdminLayout>
  );
};
