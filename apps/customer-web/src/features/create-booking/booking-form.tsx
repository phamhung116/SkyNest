import { useMutation, useQuery } from "@tanstack/react-query";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import type { BookingCreatePayload, PickupLocation } from "@paragliding/api-client";
import { Button, Card, Dialog, Field, Input, Panel, Textarea } from "@paragliding/ui";
import { customerApi } from "@/shared/config/api";
import { formatCurrency } from "@/shared/lib/format";
import { LocalizedTextSource, resolveFeatureNameSource, resolveServiceNameSource } from "@/shared/lib/localized-content";
import { serviceQueryOptions } from "@/shared/lib/query-options";
import { checkoutStorage, trackingLookupStorage } from "@/shared/lib/storage";
import { useTranslatedText } from "@/shared/lib/use-translated-text";
import { useAuth } from "@/shared/providers/auth-provider";
import { useI18n } from "@/shared/providers/i18n-provider";

type BookingFormProps = {
  serviceSlug: string;
  selectedDate: string;
  selectedTime: string;
};

type BookingSubmitForm = BookingCreatePayload & {
  agree_terms: boolean;
};

const PICKUP_FEE = 50000;
const DEPOSIT_PERCENT = 40;
const PAYOS_PAYMENT_METHOD = "gateway";

const PickupLocationMap = lazy(() =>
  import("./pickup-location-map").then((module) => ({ default: module.PickupLocationMap }))
);

const EMPTY_LOCALIZED_TEXT_SOURCE: LocalizedTextSource = { text: "", source: "vi" };

const flightTerms = [
  {
    title: "1. Giới thiệu chung",
    content: [
      "Các điều khoản và điều kiện này quy định quyền và nghĩa vụ giữa đơn vị cung cấp dịch vụ và khách hàng khi tham gia các hoạt động dù lượn tandem (bay đôi có phi công điều khiển).",
      "Khi thực hiện đặt lịch, thanh toán hoặc tham gia chuyến bay, khách hàng được hiểu là đã đọc, hiểu và đồng ý với toàn bộ nội dung của điều khoản này."
    ]
  },
  {
    title: "2. Điều kiện tham gia bay",
    content: [
      "Khách hàng tham gia dịch vụ cần đáp ứng các điều kiện sau:",
      "Có đầy đủ năng lực hành vi dân sự theo quy định pháp luật.",
      "Độ tuổi tối thiểu từ 6 tuổi trở lên; trẻ em cần có người giám hộ đồng ý.",
      "Cân nặng phù hợp với điều kiện thiết bị và thời tiết thực tế.",
      "Không sử dụng rượu bia, chất kích thích trước khi bay.",
      "Không mắc các bệnh lý ảnh hưởng đến an toàn bay.",
      "Đơn vị tổ chức và phi công có quyền từ chối phục vụ nếu đánh giá khách hàng không đủ điều kiện an toàn để tham gia bay."
    ]
  },
  {
    title: "3. Quy định về thời tiết và an toàn bay",
    content: [
      "Hoạt động dù lượn phụ thuộc trực tiếp vào điều kiện thời tiết và yếu tố an toàn thực tế.",
      "Chuyến bay có thể bị trì hoãn, thay đổi thời gian hoặc hủy bỏ trong các trường hợp gió mạnh, mưa, dông sét, sương mù hoặc các điều kiện không đảm bảo an toàn.",
      "Quyết định cuối cùng thuộc về phi công và đội ngũ vận hành."
    ]
  },
  {
    title: "4. Quy trình đặt lịch và thanh toán",
    content: [
      "Khách hàng có thể đặt lịch thông qua website, hotline hoặc các kênh chính thức của công ty.",
      "Để xác nhận lịch bay, khách hàng cần thanh toán tiền cọc theo chính sách từng thời điểm.",
      "Trong trường hợp hủy chuyến do thời tiết hoặc lý do an toàn, khách hàng sẽ được hỗ trợ đổi lịch hoặc hoàn tiền theo chính sách áp dụng."
    ]
  },
  {
    title: "5. Cam kết và trách nhiệm của khách hàng",
    content: [
      "Khách hàng cam kết cung cấp thông tin trung thực, tuân thủ hướng dẫn của phi công, mặc trang phục phù hợp và không có hành vi gây nguy hiểm cho bản thân hoặc người khác.",
      "Khách hàng chịu trách nhiệm đối với tài sản cá nhân và các thiệt hại phát sinh do lỗi cá nhân."
    ]
  },
  {
    title: "6. Ghi hình và sử dụng hình ảnh",
    content: [
      "Trong quá trình cung cấp dịch vụ, công ty có thể chụp ảnh, quay video trải nghiệm bay để phục vụ mục đích truyền thông và quảng bá.",
      "Nếu khách hàng không đồng ý sử dụng hình ảnh, cần thông báo trước với nhân viên vận hành."
    ]
  },
  {
    title: "7. Giới hạn trách nhiệm",
    content: [
      "Dù lượn là hoạt động thể thao ngoài trời có yếu tố mạo hiểm tự nhiên.",
      "Đơn vị tổ chức không chịu trách nhiệm đối với các sự cố phát sinh từ việc khách hàng vi phạm hướng dẫn an toàn hoặc các trường hợp bất khả kháng."
    ]
  },
  {
    title: "8. Quyền từ chối cung cấp dịch vụ",
    content: [
      "Đơn vị tổ chức có quyền từ chối hoặc chấm dứt cung cấp dịch vụ nếu khách hàng có dấu hiệu say xỉn, gây rối, không tuân thủ hướng dẫn an toàn hoặc không đảm bảo điều kiện bay an toàn."
    ]
  },
  {
    title: "9. Bảo mật thông tin",
    content: [
      "Thông tin cá nhân của khách hàng sẽ được bảo mật và chỉ sử dụng cho mục đích vận hành dịch vụ, thanh toán và hỗ trợ khách hàng."
    ]
  },
  {
    title: "10. Điều khoản cuối cùng",
    content: [
      "Đơn vị tổ chức có quyền cập nhật hoặc điều chỉnh các điều khoản này nhằm đảm bảo an toàn vận hành và phù hợp với quy định pháp luật hiện hành."
    ]
  }
];

const BookingFeatureItem = ({ text, source }: LocalizedTextSource) => {
  const label = useTranslatedText(text, { source });
  return <li>{label}</li>;
};

export const BookingForm = ({ serviceSlug, selectedDate, selectedTime }: BookingFormProps) => {
  const navigate = useNavigate();
  const { account } = useAuth();
  const { locale, tText } = useI18n();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pickupPoint, setPickupPoint] = useState<PickupLocation | null>(null);
  const [pickupConfirmed, setPickupConfirmed] = useState(false);
  const [resolvedPickupAddress, setResolvedPickupAddress] = useState("");
  const [debouncedPickupAddress, setDebouncedPickupAddress] = useState("");
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);

  const accountNeedsContactDetails = !account?.phone || account.phone.startsWith("EMAIL");
  const accountPhone = accountNeedsContactDetails ? "" : account?.phone ?? "";

  const { data: servicePackage } = useQuery({
    ...serviceQueryOptions(serviceSlug),
  });

  const defaultValues = useMemo<BookingSubmitForm>(
    () => ({
      service_slug: serviceSlug,
      flight_date: selectedDate,
      flight_time: selectedTime,
      customer_name: account?.full_name ?? "",
      phone: accountPhone,
      email: account?.email ?? "",
      adults: 1,
      children: 0,
      notes: "",
      payment_method: PAYOS_PAYMENT_METHOD,
      pickup_option: "self",
      pickup_address: "",
      pickup_lat: null,
      pickup_lng: null,
      agree_terms: false,
    }),
    [account?.email, account?.full_name, accountPhone, selectedDate, selectedTime, serviceSlug]
  );

  const { register, handleSubmit, watch, formState, reset, setValue } = useForm<BookingSubmitForm>({
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    reset(defaultValues);
    setPickupPoint(null);
    setPickupConfirmed(false);
    setResolvedPickupAddress("");
  }, [defaultValues, reset]);

  const pickupOption = watch("pickup_option");
  const pickupAddress = watch("pickup_address") ?? "";
  const trimmedPickupAddress = pickupAddress.trim();
  const adults = Number(watch("adults") ?? 0);
  const children = Number(watch("children") ?? 0);
  const totalGuests = Math.max(0, adults + children);
  const tourTotal = Number(servicePackage?.price ?? 0) * totalGuests;
  const pickupFee = pickupOption === "pickup" ? PICKUP_FEE : 0;
  const finalTotal = tourTotal + pickupFee;
  const depositAmount = tourTotal * (DEPOSIT_PERCENT / 100) + pickupFee;

  const mutation = useMutation({
    mutationFn: ({ agree_terms: _, ...payload }: BookingSubmitForm) => customerApi.createBooking(payload),
    onSuccess: (result) => {
      setSuccessMessage(`${tText("Đặt lịch thành công. Mã đặt lịch")} ${result.booking.code}. ${tText("Đang chuyển sang bước thanh toán đặt cọc...")}`);
      checkoutStorage.set(result);
      trackingLookupStorage.set(account?.email ?? account?.phone ?? "");
      window.setTimeout(() => navigate("/checkout"), 900);
    },
  });

  useEffect(() => {
    if (pickupOption !== "pickup" || trimmedPickupAddress.length < 3) {
      setDebouncedPickupAddress("");
      return;
    }

    const timer = window.setTimeout(() => setDebouncedPickupAddress(trimmedPickupAddress), 350);
    return () => window.clearTimeout(timer);
  }, [pickupOption, trimmedPickupAddress]);

  const pickupSuggestionsQuery = useQuery({
    queryKey: ["pickup-location-suggestions", debouncedPickupAddress],
    queryFn: () => customerApi.suggestPickupLocations(debouncedPickupAddress),
    enabled:
      pickupOption === "pickup" &&
      debouncedPickupAddress.length >= 3 &&
      !pickupConfirmed &&
      (!pickupPoint || resolvedPickupAddress !== debouncedPickupAddress),
    staleTime: 60_000,
  });

  const pickupLookupMutation = useMutation({
    mutationFn: (address: string) => customerApi.resolvePickupLocation(address),
    onSuccess: (location, address) => {
      setPickupPoint(location);
      setPickupConfirmed(false);
      setResolvedPickupAddress(address.trim());
      setValue("pickup_lat", null, { shouldValidate: true });
      setValue("pickup_lng", null, { shouldValidate: true });
    },
  });

  useEffect(() => {
    if (pickupOption !== "pickup") {
      setPickupPoint(null);
      setPickupConfirmed(false);
      setResolvedPickupAddress("");
      setValue("pickup_lat", null, { shouldValidate: true });
      setValue("pickup_lng", null, { shouldValidate: true });
      return;
    }

    if (resolvedPickupAddress && pickupAddress.trim() !== resolvedPickupAddress) {
      setPickupConfirmed(false);
      setValue("pickup_lat", null, { shouldValidate: true });
      setValue("pickup_lng", null, { shouldValidate: true });
    }
  }, [pickupAddress, pickupOption, resolvedPickupAddress, setValue]);

  const serviceNameSource = servicePackage ? resolveServiceNameSource(servicePackage, locale) : EMPTY_LOCALIZED_TEXT_SOURCE;
  const serviceName = useTranslatedText(serviceNameSource.text || serviceSlug, { source: serviceNameSource.source });
  const pickupNeedsConfirmation = pickupOption === "pickup";
  const pickupReady = !pickupNeedsConfirmation || Boolean(pickupConfirmed && pickupPoint);

  const handlePickupMapChange = (point: PickupLocation) => {
    setPickupPoint(point);
    setPickupConfirmed(false);
    setValue("pickup_lat", null, { shouldValidate: true });
    setValue("pickup_lng", null, { shouldValidate: true });
  };

  const selectPickupSuggestion = (point: PickupLocation) => {
    const nextAddress = point.name.trim();
    setPickupPoint(point);
    setPickupConfirmed(false);
    setResolvedPickupAddress(nextAddress);
    setValue("pickup_address", nextAddress, { shouldDirty: true, shouldValidate: true });
    setValue("pickup_lat", null, { shouldValidate: true });
    setValue("pickup_lng", null, { shouldValidate: true });
  };

  const confirmPickupPoint = () => {
    if (!pickupPoint) {
      return;
    }

    setPickupConfirmed(true);
    setResolvedPickupAddress(pickupAddress.trim());
    setValue("pickup_lat", pickupPoint.lat, { shouldValidate: true });
    setValue("pickup_lng", pickupPoint.lng, { shouldValidate: true });
  };

  return (
    <div className="booking-form-layout">
      {successMessage ? <div className="booking-toast">{successMessage}</div> : null}

      <Card>
        <Panel className="booking-summary-card">
          <h3>{tText("Tóm tắt đặt lịch")}</h3>
          <div className="booking-summary-card__fact">
            <span>{tText("Dịch vụ")}</span>
            <strong>{serviceName}</strong>
          </div>
          <div className="booking-summary-card__fact">
            <span>{tText("Ngày bay")}</span>
            <strong>{selectedDate}</strong>
          </div>
          <div className="booking-summary-card__fact">
            <span>{tText("Khung giờ")}</span>
            <strong>{selectedTime}</strong>
          </div>
          <div className="booking-summary-card__fact">
            <span>{tText("Giá trị tour")}</span>
            <strong>{formatCurrency(tourTotal)}</strong>
          </div>
          <div className="booking-summary-card__fact">
            <span>{tText("Xe đón")}</span>
            <strong>{pickupFee ? formatCurrency(pickupFee) : tText("Tự đến")}</strong>
          </div>
          <div className="booking-summary-card__fact">
            <span>{tText("Tổng giá trị")}</span>
            <strong>{formatCurrency(finalTotal)}</strong>
          </div>
          <div className="booking-summary-card__fact">
            <span>{tText("Cần trả trước")}</span>
            <strong>{formatCurrency(depositAmount)}</strong>
          </div>
          {servicePackage?.included_features.length ? (
            <div className="booking-summary-card__features">
              <span>{tText("Dịch vụ đi kèm")}</span>
              <ul>
                {servicePackage.included_features.map((feature) => (
                  <BookingFeatureItem key={feature.id} {...resolveFeatureNameSource(feature, locale)} />
                ))}
              </ul>
            </div>
          ) : null}
          <p className="booking-summary-card__note">
            {tText("Tiền trả trước gồm")} {DEPOSIT_PERCENT}% {tText("giá trị tour và phí xe đón nếu khách chọn xe đến đón.")}
          </p>
        </Panel>
      </Card>

      <Card>
        <Panel className="stack">
          <form className="booking-form-grid" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
            <input type="hidden" value={PAYOS_PAYMENT_METHOD} {...register("payment_method")} />
            <input type="hidden" {...register("pickup_lat", { valueAsNumber: true })} />
            <input type="hidden" {...register("pickup_lng", { valueAsNumber: true })} />

            <div className="booking-form-grid__cols">
              <Field label={tText("Họ và tên")}>
                {accountNeedsContactDetails ? (
                  <Input {...register("customer_name", { required: true })} />
                ) : (
                  <Input value={account?.full_name ?? ""} disabled readOnly />
                )}
              </Field>
              <Field label={tText("Số điện thoại")}>
                {accountNeedsContactDetails ? (
                  <Input {...register("phone", { required: true })} />
                ) : (
                  <Input value={accountPhone} disabled readOnly />
                )}
              </Field>
            </div>

            <div className="booking-form-grid__cols">
              <Field label="Email">
                <Input type="email" value={account?.email ?? ""} disabled readOnly />
              </Field>
              <Field label={tText("Số người lớn")}>
                <Input type="number" min={0} {...register("adults", { valueAsNumber: true })} />
              </Field>
            </div>

            <div className="booking-form-grid__cols">
              <Field label={tText("Số trẻ em")}>
                <Input type="number" min={0} {...register("children", { valueAsNumber: true })} />
              </Field>
              <Field label={tText("Ghi chú")}>
                <Textarea {...register("notes")} />
              </Field>
            </div>

            <div className="stack-sm">
              <strong>{tText("Di chuyển đến điểm bay")}</strong>
              <div className="payment-options payment-options--pickup">
                <label className={`payment-option ${pickupOption !== "pickup" ? "is-active" : ""}`}>
                  <input type="radio" value="self" {...register("pickup_option")} />
                  <strong>{tText("Tự đến điểm hẹn")}</strong>
                  <span>{tText("Khách tự di chuyển đến khu vực Chùa Bửu Đài Sơn.")}</span>
                </label>
                <label className={`payment-option ${pickupOption === "pickup" ? "is-active" : ""}`}>
                  <input type="radio" value="pickup" {...register("pickup_option")} />
                  <strong>{tText("Xe đến đón")}</strong>
                  <span>{tText("Cộng thêm 50.000 VND vào tiền trả trước.")}</span>
                </label>
              </div>

              {pickupOption === "pickup" ? (
                <div className="stack-sm">
                  <Field label={tText("Địa chỉ đón")}>
                    <div className="pickup-address-picker">
                      <Input
                        autoComplete="street-address"
                        placeholder={tText("Nhập khách sạn, homestay, số nhà tại Đà Nẵng")}
                        {...register("pickup_address", {
                          required: pickupOption === "pickup" ? tText("Nhập địa chỉ đón.") : false,
                        })}
                      />
                      {!pickupConfirmed && resolvedPickupAddress !== trimmedPickupAddress && pickupSuggestionsQuery.isFetching ? (
                        <div className="pickup-address-picker__hint">{tText("Đang tìm gợi ý gần Đà Nẵng...")}</div>
                      ) : null}
                      {!pickupConfirmed && resolvedPickupAddress !== trimmedPickupAddress && pickupSuggestionsQuery.data?.length ? (
                        <div className="pickup-address-picker__list">
                          {pickupSuggestionsQuery.data.map((suggestion) => (
                            <button
                              key={`${suggestion.lat}-${suggestion.lng}-${suggestion.name}`}
                              type="button"
                              className="pickup-address-picker__item"
                              onClick={() => selectPickupSuggestion(suggestion)}
                            >
                              <strong>{suggestion.name.split(",")[0]}</strong>
                              <span>{suggestion.name}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </Field>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={pickupLookupMutation.isPending || !trimmedPickupAddress}
                      onClick={() => pickupLookupMutation.mutate(trimmedPickupAddress)}
                    >
                      {pickupLookupMutation.isPending ? tText("Đang định vị...") : tText("Dùng địa chỉ này")}
                    </Button>
                    {pickupConfirmed ? <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">{tText("Đã xác nhận điểm đón")}</span> : null}
                  </div>

                  {pickupLookupMutation.error instanceof Error ? (
                    <p className="form-error">{pickupLookupMutation.error.message}</p>
                  ) : null}

                  {pickupPoint ? (
                    <div className="stack-sm rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <p className="m-0 text-sm text-stone-600">
                        {tText("Chọn đúng ghim như app gọi xe. Nếu cần, bấm vào bản đồ để chỉnh lại vị trí rồi xác nhận điểm đón.")}
                      </p>
                      <Suspense fallback={<div className="pickup-location-map" aria-hidden="true" />}>
                        <PickupLocationMap point={pickupPoint} onChange={handlePickupMapChange} />
                      </Suspense>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs font-medium text-stone-500">
                          {pickupPoint.lat.toFixed(6)}, {pickupPoint.lng.toFixed(6)}
                        </span>
                        <Button type="button" onClick={confirmPickupPoint}>
                          {tText("Xác nhận điểm đón")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {formState.errors.pickup_address ? <p className="form-error">{formState.errors.pickup_address.message}</p> : null}
              {pickupNeedsConfirmation && !pickupReady ? (
                <p className="form-error">{tText("Hãy hiển thị và xác nhận điểm đón trên bản đồ.")}</p>
              ) : null}
            </div>

            <div className="stack-sm">
              <strong>{tText("Phương thức thanh toán")}</strong>
              <div className="payment-options">
                <div className="payment-option is-active">
                  <strong>{tText("payOS")}</strong>
                  <span>{tText("Thanh toán đặt cọc qua payOS bằng QR hoặc cổng thanh toán.")}</span>
                </div>
              </div>
            </div>

            <div className="terms-check">
              <input id="booking-flight-terms" type="checkbox" {...register("agree_terms", { required: true })} />
              <span>
                <label htmlFor="booking-flight-terms">{tText("Tôi đồng ý với")}</label>{" "}
                <button type="button" className="terms-link" onClick={() => setTermsDialogOpen(true)}>
                  {tText("điều khoản bay")}
                </button>{" "}
                <label htmlFor="booking-flight-terms">{tText("của doanh nghiệp.")}</label>
              </span>
            </div>

            {mutation.error instanceof Error ? <p className="form-error">{mutation.error.message}</p> : null}

            <div className="booking-form-actions">
              <p>{tText("Thông tin liên hệ được lấy từ tài khoản. Nếu cần chỉnh sửa, hãy cập nhật trong trang tài khoản.")}</p>
              <Button disabled={mutation.isPending || !formState.isValid || !pickupReady}>
                {mutation.isPending ? tText("Đang gửi đặt lịch...") : tText("Xác nhận đặt lịch")}
              </Button>
            </div>
          </form>
        </Panel>
      </Card>

      <Dialog
        open={termsDialogOpen}
        onOpenChange={setTermsDialogOpen}
        title="Điều khoản và điều kiện tham gia dịch vụ dù lượn"
        description="Áp dụng cho khách hàng sử dụng dịch vụ tại Da Nang Paragliding"
        className="flight-terms-dialog"
        footer={
          <Button type="button" onClick={() => setTermsDialogOpen(false)}>
            {tText("Đóng")}
          </Button>
        }
      >
        <div className="flight-terms-content">
          {flightTerms.map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              {section.content.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
      </Dialog>
    </div>
  );
};
