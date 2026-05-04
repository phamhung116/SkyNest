import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Badge, Button, Card, Container, Panel } from "@paragliding/ui";
import { useAuth } from "@/shared/providers/auth-provider";
import { useI18n } from "@/shared/providers/i18n-provider";
import { bookingRules } from "@/shared/constants/customer-content";
import { routes } from "@/shared/config/routes";
import { BookingForm } from "@/features/create-booking/booking-form";
import { availabilityQueryOptions } from "@/shared/lib/query-options";
import { SiteLayout } from "@/widgets/layout/site-layout";
import { BookingCalendar } from "@/widgets/booking-calendar/booking-calendar";

const parseDateKey = (value: string) => {
  const [rawYear, rawMonth] = value.split("-").map(Number);
  return {
    year: rawYear || new Date().getFullYear(),
    month: rawMonth || new Date().getMonth() + 1
  };
};

export const BookingPage = () => {
  const [params] = useSearchParams();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { tText } = useI18n();
  const initialService = params.get("service") ?? "";
  const initialDate = params.get("date") ?? "";
  const initialTime = params.get("time") ?? "";
  const initialCalendar = parseDateKey(initialDate);
  const [calendarState, setCalendarState] = useState(initialCalendar);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(
    initialDate && initialTime ? { date: initialDate, time: initialTime } : null
  );

  const bookingContext = useMemo(
    () => ({
      service: initialService,
      date: selectedSlot?.date ?? "",
      time: selectedSlot?.time ?? ""
    }),
    [initialService, selectedSlot?.date, selectedSlot?.time]
  );

  const availabilityMonths = useMemo(() => {
    const currentDate = new Date(calendarState.year, calendarState.month - 1, 1);
    const prevDate = new Date(calendarState.year, calendarState.month - 2, 1);
    const nextDate = new Date(calendarState.year, calendarState.month, 1);

    return [prevDate, currentDate, nextDate].map((date) => ({
      year: date.getFullYear(),
      month: date.getMonth() + 1
    }));
  }, [calendarState.month, calendarState.year]);

  const availabilityQueries = useQueries({
    queries: availabilityMonths.map(({ year, month }) => ({
      ...availabilityQueryOptions(bookingContext.service, year, month),
      enabled: Boolean(bookingContext.service)
    }))
  });

  const availability = useMemo(() => {
    const merged = availabilityQueries.flatMap((query) => query.data ?? []);
    const uniqueDays = new Map(merged.map((day) => [day.date, day]));
    return Array.from(uniqueDays.values()).sort((left, right) => left.date.localeCompare(right.date));
  }, [availabilityQueries]);

  if (!bookingContext.service) {
    return (
      <SiteLayout>
        <section className="section customer-flow-section">
          <Container className="stack">
            <Badge tone="danger">{tText("Thiếu thông tin đặt lịch")}</Badge>
            <h2 className="detail-title">{tText("Hãy chọn một gói dịch vụ trước khi đặt lịch.")}</h2>
            <Link to={routes.services}>
              <Button variant="secondary">{tText("Quay lại danh sách dịch vụ")}</Button>
            </Link>
          </Container>
        </section>
      </SiteLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <SiteLayout>
        <section className="section customer-flow-section">
          <Container className="stack">
            <Badge>{tText("Bắt buộc đăng nhập")}</Badge>
            <h2 className="detail-title">{tText("Đăng nhập để tiếp tục đặt lịch")}</h2>
            <p className="detail-copy">
              {tText("Hệ thống sẽ tự động điền email, số điện thoại và lưu lịch sử đặt lịch vào tài khoản của bạn.")}
            </p>
            <Link to={`${routes.login}?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`}>
              <Button>{tText("Đăng nhập ngay")}</Button>
            </Link>
          </Container>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="section customer-flow-section">
        <Container className="stack">

          <Card>
            <Panel className="stack">
              <BookingCalendar
                year={calendarState.year}
                month={calendarState.month}
                days={availability}
                selectedSlot={selectedSlot}
                onMonthChange={(year, month) => setCalendarState({ year, month })}
                onSelectSlot={setSelectedSlot}
                weatherAside
              />
            </Panel>
          </Card>

          {bookingContext.date && bookingContext.time ? (
            <BookingForm
              serviceSlug={bookingContext.service}
              selectedDate={bookingContext.date}
              selectedTime={bookingContext.time}
            />
          ) : (
            <Card>
              <Panel className="calendar-selection-card">
                <Badge tone="danger">{tText("Chưa chọn khung giờ")}</Badge>
                <strong>{tText("Hãy chọn một ô còn trống trên lịch trước khi điền biểu mẫu đặt lịch.")}</strong>
              </Panel>
            </Card>
          )}
        </Container>
      </section>
    </SiteLayout>
  );
};
