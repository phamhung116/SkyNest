import type { Booking, Post, ServiceFeature, ServicePackage, Tracking } from "@paragliding/api-client";

import { repairFlightConditionLabel } from "@/shared/lib/flight-condition";
import { repairVietnameseText, type Locale } from "@/shared/providers/i18n-provider";

export type LocalizedTextSource = {
  text: string;
  source: Locale;
};

const toComparableText = (value: string) =>
  repairVietnameseText(String(value ?? ""))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const hasVietnameseMarks = (value: string) => /[ăâêôơưđĂÂÊÔƠƯĐáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/u.test(value);

const pickSourceText = (primary: string, secondary: string) => {
  const normalizedPrimary = repairVietnameseText(String(primary ?? "")).trim();
  if (normalizedPrimary) {
    return normalizedPrimary;
  }

  const normalizedSecondary = repairVietnameseText(String(secondary ?? "")).trim();
  return normalizedSecondary;
};

const pickLocalizedSource = (primary: string, secondary: string, locale?: Locale): LocalizedTextSource => {
  const normalizedPrimary = repairVietnameseText(String(primary ?? "")).trim();
  const normalizedSecondary = repairVietnameseText(String(secondary ?? "")).trim();
  const primaryComparable = toComparableText(normalizedPrimary);
  const secondaryComparable = toComparableText(normalizedSecondary);
  const duplicatedMeaning =
    Boolean(primaryComparable) &&
    Boolean(secondaryComparable) &&
    primaryComparable === secondaryComparable;
  const secondaryLooksVietnamese = hasVietnameseMarks(normalizedSecondary);

  if (locale === "en" && normalizedSecondary && !duplicatedMeaning && !secondaryLooksVietnamese) {
    return { text: normalizedSecondary, source: "en" };
  }

  if (normalizedPrimary) {
    return { text: normalizedPrimary, source: "vi" };
  }

  if (normalizedSecondary) {
    return { text: normalizedSecondary, source: secondaryLooksVietnamese ? "vi" : "en" };
  }

  return { text: "", source: "vi" };
};

export const resolveServiceNameSource = (service: Pick<ServicePackage, "name" | "name_en">, locale?: Locale) =>
  pickLocalizedSource(service.name, service.name_en, locale);

export const localizeServiceName = (service: Pick<ServicePackage, "name" | "name_en">, _locale?: Locale) =>
  pickSourceText(service.name, service.name_en);

export const localizeServiceShortDescription = (
  service: Pick<ServicePackage, "short_description" | "short_description_en">,
  _locale?: Locale
) => pickSourceText(service.short_description, service.short_description_en);

export const resolveServiceShortDescriptionSource = (
  service: Pick<ServicePackage, "short_description" | "short_description_en">,
  locale?: Locale
) => pickLocalizedSource(service.short_description, service.short_description_en, locale);

export const localizeServiceDescription = (
  service: Pick<ServicePackage, "description" | "description_en">,
  _locale?: Locale
) => pickSourceText(service.description, service.description_en);

export const resolveServiceDescriptionSource = (
  service: Pick<ServicePackage, "description" | "description_en">,
  locale?: Locale
) => pickLocalizedSource(service.description, service.description_en, locale);

export const localizeFeatureName = (feature: Pick<ServiceFeature, "name" | "name_en">, _locale?: Locale) =>
  pickSourceText(feature.name, feature.name_en);

export const resolveFeatureNameSource = (feature: Pick<ServiceFeature, "name" | "name_en">, locale?: Locale) =>
  pickLocalizedSource(feature.name, feature.name_en, locale);

export const localizeFeatureDescription = (
  feature: Pick<ServiceFeature, "description" | "description_en">,
  _locale?: Locale
) => pickSourceText(feature.description, feature.description_en);

export const localizePostTitle = (post: Pick<Post, "title" | "title_en">, _locale?: Locale) =>
  pickSourceText(post.title, post.title_en);

export const resolvePostTitleSource = (post: Pick<Post, "title" | "title_en">, locale?: Locale) =>
  pickLocalizedSource(post.title, post.title_en, locale);

export const localizePostExcerpt = (post: Pick<Post, "excerpt" | "excerpt_en">, _locale?: Locale) =>
  pickSourceText(post.excerpt, post.excerpt_en);

export const resolvePostExcerptSource = (post: Pick<Post, "excerpt" | "excerpt_en">, locale?: Locale) =>
  pickLocalizedSource(post.excerpt, post.excerpt_en, locale);

export const localizePostContent = (post: Pick<Post, "content" | "content_en">, _locale?: Locale) =>
  pickSourceText(post.content, post.content_en);

export const resolvePostContentSource = (post: Pick<Post, "content" | "content_en">, locale?: Locale) =>
  pickLocalizedSource(post.content, post.content_en, locale);

export const localizeBookingServiceName = (
  record: Pick<Booking, "service_name" | "service_name_en"> | Pick<Tracking, "service_name" | "service_name_en">,
  _locale?: Locale
) => pickSourceText(record.service_name, record.service_name_en);

export const resolveBookingServiceNameSource = (
  record: Pick<Booking, "service_name" | "service_name_en"> | Pick<Tracking, "service_name" | "service_name_en">,
  locale?: Locale
) => pickLocalizedSource(record.service_name, record.service_name_en, locale);

export { repairFlightConditionLabel };
