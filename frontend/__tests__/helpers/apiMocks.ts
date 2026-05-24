export function apiSuccess<T>(data: T, message = "OK") {
  return { data: { data, message } };
}

export function apiPaginated<T>(data: T, pagination = defaultPagination()) {
  return {
    data: {
      success: true,
      message: "OK",
      data,
      pagination,
    },
  };
}

function defaultPagination() {
  return { page: 1, limit: 20, total: 1, totalPages: 1 };
}
